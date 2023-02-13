/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import { node, Project, Script, Contract, EventSig, FieldsSig } from '@alephium/web3'
import * as prettier from 'prettier'
import path from 'path'
import fs from 'fs'

const oneAlph = `ONE_ALPH`
const header = `/* Autogenerated file. Do not edit manually. */\n/* tslint:disable */\n/* eslint-disable */\n\n`
const eventTypeInvalidNames = ['blockHash', 'txId', 'eventIndex']
const stateTypeInvalidNames = [
  'address',
  'contractId',
  'bytecode',
  'initialStateHash',
  'codeHash',
  'fieldsSig',
  'asset'
]

function array(str: string, size: number): string {
  const result = Array(size).fill(str).join(', ')
  return `[${result}]`
}

function parseArrayType(tpe: string): string {
  const ignored = '[;]'
  const tokens: string[] = []
  let acc = ''
  for (let index = 0; index < tpe.length; index++) {
    if (!ignored.includes(tpe.charAt(index))) {
      acc = acc + tpe.charAt(index)
    } else if (acc !== '') {
      tokens.push(acc)
      acc = ''
    }
  }
  const baseTsType = toTsType(tokens[0])
  const sizes = tokens.slice(1).map((str) => parseInt(str))
  return sizes.reduce((acc, size) => array(acc, size), baseTsType)
}

function toTsType(ralphType: string): string {
  switch (ralphType) {
    case 'U256':
    case 'I256':
      return 'bigint'
    case 'Bool':
      return 'boolean'
    case 'Address':
    case 'ByteVec':
      return 'HexString'
    default: // array type
      return parseArrayType(ralphType)
  }
}

function formatParameters(fieldsSig: node.FieldsSig): string {
  if (fieldsSig.names.length === 0) {
    return ''
  }
  const params = fieldsSig.names.map((name, idx) => `${name}: ${toTsType(fieldsSig.types[`${idx}`])}`).join(', ')
  return `${params}, `
}

function formatToStringArray(strs: string[]): string {
  return `[${strs.map((str) => `'${str}'`).join(', ')}]`
}

function functionParamsSig(functionSig: node.FunctionSig): FieldsSig {
  return {
    names: functionSig.paramNames,
    types: functionSig.paramTypes,
    isMutable: functionSig.paramIsMutable
  }
}

function genCallMethod(functionSig: node.FunctionSig, funcIndex: number): string {
  if (!functionSig.isPublic || functionSig.returnTypes.length === 0) {
    return ''
  }
  const funcName = functionSig.name.charAt(0).toUpperCase() + functionSig.name.slice(1)
  const paramsSig = functionParamsSig(functionSig)
  const callParams =
    'callParams?: {worldStateBlockHash?: string, txId?: string, existingContracts?: string[], inputAssets?: node.TestInputAsset[]}'
  const argNames = formatToStringArray(paramsSig.names)
  const argTypes = formatToStringArray(paramsSig.types)
  const funcHasArgs = functionSig.paramNames.length > 0
  const funcArgs = funcHasArgs ? `args: {${formatParameters(paramsSig)}}, ` : ''
  const ralphRetTypes = formatToStringArray(functionSig.returnTypes)
  const tsReturnTypes = functionSig.returnTypes.map((tpe) => toTsType(tpe))
  const retType = tsReturnTypes.length === 1 ? `${tsReturnTypes[0]}` : `[${tsReturnTypes.join(', ')}]`
  const args = funcHasArgs
    ? `toApiVals({${paramsSig.names.map((str) => `${str}: args.${str}`)}}, ${argNames}, ${argTypes})`
    : '[]'
  return `
    async call${funcName}Method(${funcArgs}${callParams}): Promise<${retType}> {
      const callResult = await web3.getCurrentNodeProvider().contracts.postContractsCallContract({
        group: this.groupIndex,
        worldStateBlockHash: callParams?.worldStateBlockHash,
        txId: callParams?.txId,
        address: this.address,
        methodIndex: ${funcIndex},
        args: ${args},
        existingContracts: callParams?.existingContracts,
        inputAssets: callParams?.inputAssets
      })
      ${
        tsReturnTypes.length === 1
          ? `return fromApiArray(callResult.returns, ${ralphRetTypes})[0] as ${retType}`
          : `return fromApiArray(callResult.returns, ${ralphRetTypes}) as ${retType}`
      }
    }
  `
}

function genDeploy(contract: Contract): string {
  const deployParams =
    'deployParams?: {initialAttoAlphAmount?: bigint, initialTokenAmounts?: Token[], issueTokenAmount?: bigint, gasAmount?: number, gasPrice?: bigint}'
  const fieldsParam = getParamsFromFieldsSig(contract.fieldsSig, `Fields`)
  const instanceName = `${contract.name}Instance`
  return `
  export async function deploy(signer: SignerProvider, ${fieldsParam}${deployParams}): Promise<SignDeployContractTxResult & { instance: ${instanceName} }> {
    const deployResult = await artifact.deploy(signer, {
      initialFields: ${getInitialFieldsFromFieldsSig(contract.fieldsSig)},
      initialAttoAlphAmount: deployParams?.initialAttoAlphAmount,
      initialTokenAmounts: deployParams?.initialTokenAmounts,
      issueTokenAmount: deployParams?.issueTokenAmount,
      gasAmount: deployParams?.gasAmount,
      gasPrice: deployParams?.gasPrice
    })
    const instance = at(deployResult.contractAddress);
    return { instance: instance, ... deployResult }
  }
  `
}

function genAttach(instanceName: string): string {
  return `
  export function at(address: string): ${instanceName} {
    return new ${instanceName}(address)
  }
  `
}

function genFetchState(contract: Contract): string {
  const assigns = contract.fieldsSig.names
    .map((name, index) => `${name}: state.fields['${name}'] as ${toTsType(contract.fieldsSig.types[`${index}`])}`)
    .join(', ')
  return `
  async fetchState(): Promise<${contract.name}.State> {
    const state = await ${contract.name}.artifact.fetchState(this.address, this.groupIndex)
    return {
      ...state,
      ${assigns}
    }
  }
  `
}

function getEventType(event: EventSig): string {
  return event.name + 'Event'
}

function genEventType(event: EventSig): string {
  event.fieldNames.forEach((name) => {
    if (eventTypeInvalidNames.includes(name)) {
      throw new Error(`Invalid event field name: ${name}`)
    }
  })
  return `
  export type ${getEventType(event)} = {
    blockHash: string,
    txId: string,
    ${event.fieldNames.map((name, index) => `${name}: ${toTsType(event.fieldTypes[`${index}`])}`).join(', ')},
    eventIndex: number
  }
  `
}

function genDecodeEvent(contractName: string, event: EventSig, eventIndex: number): string {
  const assigns = event.fieldNames
    .map((name, index) => `${name}: fields['${name}'] as ${toTsType(event.fieldTypes[`${index}`])}`)
    .join(', ')
  const eventType = getEventType(event)
  return `
    private decode${eventType}(event: node.ContractEvent): ${contractName}.${eventType} {
      if (event.eventIndex !== ${eventIndex}) {
        throw new Error('Invalid event index: ' + event.eventIndex + ', expected: ${eventIndex}')
      }
      const fields = fromApiVals(
        event.fields,
        ${formatToStringArray(event.fieldNames)},
        ${formatToStringArray(event.fieldTypes)}
      )
      return {
        blockHash: event.blockHash,
        txId: event.txId,
        ${assigns},
        eventIndex: event.eventIndex
      }
    }
  `
}

function genSubscribeToEvents(eventTypes: string): string {
  return `
    const errorCallback = (err: any, subscription: Subscription<node.ContractEvent>): Promise<void> => {
      return options.errorCallback(err, subscription as unknown as Subscription<${eventTypes}>)
    }
    const opt: SubscribeOptions<node.ContractEvent> = {
      pollingInterval: options.pollingInterval,
      messageCallback: messageCallback,
      errorCallback: errorCallback
    }
    return subscribeToEvents(opt, this.address, fromCount)
  `
}

function genSubscribeEvent(contractName: string, event: EventSig, eventIndex: number): string {
  const eventType = getEventType(event)
  const scopedEventType = `${contractName}.${eventType}`
  return `
    ${genDecodeEvent(contractName, event, eventIndex)}

    subscribe${eventType}(options: SubscribeOptions<${scopedEventType}>, fromCount?: number): EventSubscription {
      const messageCallback = (event: node.ContractEvent): Promise<void> => {
        if (event.eventIndex !== ${eventIndex}) {
          return Promise.resolve()
        }
        return options.messageCallback(this.decode${eventType}(event))
      }
      ${genSubscribeToEvents(scopedEventType)}
    }
  `
}

function genSubscribeAllEvents(contract: Contract): string {
  if (contract.eventsSig.length <= 1) {
    return ''
  }
  const eventTypes = contract.eventsSig.map((e) => `${contract.name}.${getEventType(e)}`).join(' | ')
  const cases = contract.eventsSig
    .map((event, index) => {
      return `
        case ${index}: {
          return options.messageCallback(this.decode${getEventType(event)}(event))
        }
      `
    })
    .join('\n')
  return `
    subscribeEvents(options: SubscribeOptions<${eventTypes}>, fromCount?: number): EventSubscription {
      const messageCallback = (event: node.ContractEvent): Promise<void> => {
        switch (event.eventIndex) {
          ${cases}
          default:
            throw new Error('Invalid event index: ' + event.eventIndex)
        }
      }
      ${genSubscribeToEvents(eventTypes)}
    }
  `
}

function genContractStateType(contract: Contract): string {
  if (contract.fieldsSig.names.length === 0) {
    return `export type State = Omit<ContractState, 'fields'>`
  }
  contract.fieldsSig.names.forEach((name) => {
    if (stateTypeInvalidNames.includes(name)) {
      throw new Error(`Invalid contract field name: ${name}`)
    }
  })
  return `
    export type Fields = {
      ${formatParameters(contract.fieldsSig)}
    }

    export type State = Fields & Omit<ContractState, 'fields'>
  `
}

function genStateForTest(contract: Contract): string {
  const fieldsParam = getParamsFromFieldsSig(contract.fieldsSig, 'Fields')
  return `
    // This is used for testing contract functions
    export function stateForTest(${fieldsParam}asset?: Asset, address?: string): ContractState {
      const newAsset = {
        alphAmount: asset?.alphAmount ?? ${oneAlph},
        tokens: asset?.tokens
      }
      return ${contract.name}.artifact.toState(${getInitialFieldsFromFieldsSig(contract.fieldsSig)}, newAsset, address)
    }
  `
}

function getParamsFromFieldsSig(fieldsSig: node.FieldsSig, tpe: string): string {
  return fieldsSig.names.length > 0 ? `initFields: ${tpe}, ` : ''
}

function getInitialFieldsFromFieldsSig(fieldsSig: node.FieldsSig): string {
  return fieldsSig.names.length > 0 ? 'initFields' : '{}'
}

function genTestMethod(contract: Contract, functionSig: node.FunctionSig, index: number): string {
  const funcName = functionSig.name.charAt(0).toUpperCase() + functionSig.name.slice(1)
  const paramsSig = functionParamsSig(functionSig)
  const funcHasArgs = paramsSig.names.length > 0
  const funcArgs = funcHasArgs ? `args: {${formatParameters(paramsSig)}}, ` : ''
  const testParams =
    'testParams?: {group?: number, address?: string, initialAsset?: Asset, existingContracts?: ContractState[], inputAssets?: InputAsset[]}'
  const fieldParam = getParamsFromFieldsSig(contract.fieldsSig, `Fields`)
  const tsReturnTypes = functionSig.returnTypes.map((tpe) => toTsType(tpe))
  const retType =
    tsReturnTypes.length === 0
      ? `Omit<TestContractResult, 'returns'>`
      : tsReturnTypes.length === 1
      ? `Omit<TestContractResult, 'returns'> & { returns: ${tsReturnTypes[0]} }`
      : `Omit<TestContractResult, 'returns'> & { returns: [${tsReturnTypes.join(', ')}] }`
  const testFuncName = functionSig.isPublic ? 'testPublicMethod' : 'testPrivateMethod'
  return `
    export async function test${funcName}Method(${funcArgs}${fieldParam}${testParams}): Promise<${retType}> {
      const initialAsset = {
        alphAmount: testParams?.initialAsset?.alphAmount ?? ${oneAlph},
        tokens: testParams?.initialAsset?.tokens
      }
      const _testParams = {
        ...testParams,
        testMethodIndex: ${index},
        testArgs: ${funcHasArgs ? 'args' : '{}'},
        initialFields: ${getInitialFieldsFromFieldsSig(contract.fieldsSig)},
        initialAsset: initialAsset,
      }
      const testResult = await artifact.${testFuncName}('${functionSig.name}', _testParams)
      const testReturns = testResult.returns as [${tsReturnTypes.join(', ')}]
      return {
        ...testResult,
        ${
          tsReturnTypes.length === 0
            ? ''
            : tsReturnTypes.length === 1
            ? 'returns: testReturns[0]'
            : 'returns: testReturns'
        }
      }
    }
  `
}

function genContract(contract: Contract, artifactRelativePath: string): string {
  const optionalImports =
    contract.eventsSig.length === 0
      ? ''
      : 'fromApiVals, subscribeToEvents, SubscribeOptions, Subscription, EventSubscription'
  const source = `
    ${header}

    import {
      web3, SignerProvider, Address, Token, toApiVals, SignDeployContractTxResult, Contract,
      ContractState, node, binToHex, TestContractResult, InputAsset, Asset, HexString,
      contractIdFromAddress, fromApiArray, ONE_ALPH, groupOfAddress, ${optionalImports}
    } from '@alephium/web3'
    import { default as ${contract.name}ContractJson } from '../${artifactRelativePath}'

    export namespace ${contract.name} {
      ${genContractStateType(contract)}
      ${contract.eventsSig.map((e) => genEventType(e)).join('\n')}

      ${genDeploy(contract)}
      ${genAttach(contract.name + 'Instance')}

      ${genStateForTest(contract)}
      ${contract.functions.map((f, index) => genTestMethod(contract, f, index)).join('\n')}

      export const artifact = Contract.fromJson(${contract.name}ContractJson)
    }

    export class ${contract.name}Instance {
      readonly address: Address
      readonly contractId: string
      readonly groupIndex: number

      constructor(
        address: Address,
      ) {
        this.address = address
        this.contractId = binToHex(contractIdFromAddress(address));
        this.groupIndex = groupOfAddress(address);
      }

      ${genFetchState(contract)}
      ${contract.eventsSig.map((e, index) => genSubscribeEvent(contract.name, e, index)).join('\n')}
      ${genSubscribeAllEvents(contract)}
      ${contract.functions.map((f, index) => genCallMethod(f, index)).join('\n')}
    }
`
  return prettier.format(source, { parser: 'typescript' })
}

function genScript(script: Script): string {
  console.log(`Generating code for script ${script.name}`)
  const withAssets =
    'executeParams?: {attoAlphAmount?: bigint, tokens?: Token[], gasAmount?: number, gasPrice?: bigint}'
  const withoutAssets = 'executeParams?: {gasAmount?: number, gasPrice?: bigint}'
  const usePreapprovedAssets = script.functions[0].usePreapprovedAssets
  const executeParams = usePreapprovedAssets ? withAssets : withoutAssets
  const scriptFields = getParamsFromFieldsSig(script.fieldsSig, `{${formatParameters(script.fieldsSig)}}`)
  return `
    export namespace ${script.name} {
      export async function execute(signer: SignerProvider, ${scriptFields}${executeParams}): Promise<SignExecuteScriptTxResult> {
        return script.execute(signer, {
          initialFields: ${getInitialFieldsFromFieldsSig(script.fieldsSig)},
          ${usePreapprovedAssets ? 'attoAlphAmount: executeParams?.attoAlphAmount' : ''},
          ${usePreapprovedAssets ? 'tokens: executeParams?.tokens' : ''},
          gasAmount: executeParams?.gasAmount,
          gasPrice: executeParams?.gasPrice
        })
      }

      export const script = Script.fromJson(${script.name}ScriptJson)
    }
  `
}

function genScripts(outDir: string, artifactDir: string, exports: string[]) {
  exports.push('./scripts')
  const scriptPath = path.join(outDir, 'scripts.ts')
  const scripts = Array.from(Project.currentProject.scripts.values())
  const importArtifacts = Array.from(scripts)
    .map((s) => {
      const artifactPath = s.sourceInfo.getArtifactPath(artifactDir)
      const artifactRelativePath = path.relative(artifactDir, artifactPath)
      return `import { default as ${s.artifact.name}ScriptJson } from '../${artifactRelativePath}'`
    })
    .join('\n')
  const scriptsSource = scripts.map((s) => genScript(s.artifact)).join('\n')
  const source = `
    ${header}

    import {
      Token,
      SignExecuteScriptTxResult,
      Script,
      SignerProvider,
      HexString
    } from '@alephium/web3'
    ${importArtifacts}

    ${scriptsSource}
  `
  const formatted = prettier.format(source, { parser: 'typescript' })
  fs.writeFileSync(scriptPath, formatted, 'utf8')
}

function genIndexTs(outDir: string, exports: string[]) {
  const indexPath = path.join(outDir, 'index.ts')
  const exportStatements = exports.map((e) => `export * from "${e}"`).join('\n')
  const source = prettier.format(header + exportStatements, { parser: 'typescript' })
  fs.writeFileSync(indexPath, source, 'utf8')
}

function genContracts(outDir: string, artifactDir: string, exports: string[]) {
  Array.from(Project.currentProject.contracts.values()).forEach((c) => {
    console.log(`Generating code for contract ${c.artifact.name}`)
    exports.push(`./${c.artifact.name}`)
    const filename = `${c.artifact.name}.ts`
    const sourcePath = path.join(outDir, filename)
    const artifactPath = c.sourceInfo.getArtifactPath(artifactDir)
    const artifactRelativePath = path.relative(artifactDir, artifactPath)
    const sourceCode = genContract(c.artifact, artifactRelativePath)
    fs.writeFileSync(sourcePath, sourceCode, 'utf8')
  })
}

export function codegen(artifactDir: string) {
  const outDirTemp = path.join(artifactDir, 'ts')
  const outDir = path.isAbsolute(outDirTemp) ? outDirTemp : path.resolve(outDirTemp)
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const exports: string[] = []
  try {
    genContracts(outDir, artifactDir, exports)
    genScripts(outDir, artifactDir, exports)
    genIndexTs(outDir, exports)
  } catch (error) {
    console.log(`Failed to generate code: ${error}`)
  }
}
