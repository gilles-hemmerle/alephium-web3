/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  Address,
  Contract,
  ContractState,
  TestContractResult,
  HexString,
  ContractFactory,
  EventSubscribeOptions,
  EventSubscription,
  CallContractParams,
  CallContractResult,
  TestContractParams,
  ContractEvent,
  subscribeContractEvent,
  subscribeContractEvents,
  testMethod,
  callMethod,
  multicallMethods,
  fetchContractState,
  ContractInstance,
  getContractEventsCurrentCount,
  Val,
} from "@alephium/web3";
import { default as DeprecatedNFTTest6ContractJson } from "../nft/DeprecatedNFTTest6.ral.json";
import { getContractByCodeHash } from "./contracts";

import { Balances, MapValue, TokenBalance, AllStructs } from "./types";
import { AllGeneratedContracts } from "./types";

// Custom types for the contract
export namespace DeprecatedNFTTest6Types {
  export interface Fields extends Record<string, Val> {
    collectionId: HexString;
    uri: HexString;
  }

  export type State = ContractState<Fields>;

  export interface CallMethodTable {
    getTokenUri: {
      params: Omit<CallContractParams<{}>, "args">;
      result: CallContractResult<HexString>;
    };
    getArray: {
      params: Omit<CallContractParams<{}>, "args">;
      result: CallContractResult<[bigint, bigint]>;
    };
  }
  export type CallMethodParams<T extends keyof CallMethodTable> =
    CallMethodTable[T]["params"];
  export type CallMethodResult<T extends keyof CallMethodTable> =
    CallMethodTable[T]["result"];
  export type MultiCallParams = Partial<{
    [Name in keyof CallMethodTable]: CallMethodTable[Name]["params"];
  }>;
  export type MultiCallResults<T extends MultiCallParams> = {
    [MaybeName in keyof T]: MaybeName extends keyof CallMethodTable
      ? CallMethodTable[MaybeName]["result"]
      : undefined;
  };
}

class Factory extends ContractFactory<
  DeprecatedNFTTest6Instance,
  DeprecatedNFTTest6Types.Fields
> {
  getInitialFieldsWithDefaultValues() {
    return this.contract.getInitialFieldsWithDefaultValues() as DeprecatedNFTTest6Types.Fields;
  }

  at(address: string): DeprecatedNFTTest6Instance {
    return new DeprecatedNFTTest6Instance(address);
  }

  tests = {
    getTokenUri: async (
      params: Omit<
        TestContractParams<DeprecatedNFTTest6Types.Fields, never>,
        "testArgs"
      >
    ): Promise<TestContractResult<HexString, {}>> => {
      return testMethod(this, "getTokenUri", params);
    },
    getArray: async (
      params: Omit<
        TestContractParams<DeprecatedNFTTest6Types.Fields, never>,
        "testArgs"
      >
    ): Promise<TestContractResult<[bigint, bigint], {}>> => {
      return testMethod(this, "getArray", params);
    },
  };
}

// Use this object to test and deploy the contract
export const DeprecatedNFTTest6 = new Factory(
  Contract.fromJson(
    DeprecatedNFTTest6ContractJson,
    "",
    "88822622be55e862a1759c4e0c02300da75fe9e3dbe73c8fbe0fa8714996629e",
    AllStructs,
    AllGeneratedContracts
  )
);

// Use this class to interact with the blockchain
export class DeprecatedNFTTest6Instance extends ContractInstance {
  constructor(address: Address) {
    super(address);
  }

  async fetchState(): Promise<DeprecatedNFTTest6Types.State> {
    return fetchContractState(DeprecatedNFTTest6, this);
  }

  methods = {
    getTokenUri: async (
      params?: DeprecatedNFTTest6Types.CallMethodParams<"getTokenUri">
    ): Promise<DeprecatedNFTTest6Types.CallMethodResult<"getTokenUri">> => {
      return callMethod(
        DeprecatedNFTTest6,
        this,
        "getTokenUri",
        params === undefined ? {} : params,
        getContractByCodeHash
      );
    },
    getArray: async (
      params?: DeprecatedNFTTest6Types.CallMethodParams<"getArray">
    ): Promise<DeprecatedNFTTest6Types.CallMethodResult<"getArray">> => {
      return callMethod(
        DeprecatedNFTTest6,
        this,
        "getArray",
        params === undefined ? {} : params,
        getContractByCodeHash
      );
    },
  };

  async multicall<Calls extends DeprecatedNFTTest6Types.MultiCallParams>(
    calls: Calls
  ): Promise<DeprecatedNFTTest6Types.MultiCallResults<Calls>> {
    return (await multicallMethods(
      DeprecatedNFTTest6,
      this,
      calls,
      getContractByCodeHash
    )) as DeprecatedNFTTest6Types.MultiCallResults<Calls>;
  }
}
