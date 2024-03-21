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
import { default as NFTCollectionWithRoyaltyTestContractJson } from "../nft/NFTCollectionWithRoyaltyTest.ral.json";
import { getContractByCodeHash } from "./contracts";

import { Balances, MapValue, TokenBalance, AllStructs } from "./types";
import { AllGeneratedContracts } from "./types";

// Custom types for the contract
export namespace NFTCollectionWithRoyaltyTestTypes {
  export interface Fields extends Record<string, Val> {
    nftTemplateId: HexString;
    collectionUri: HexString;
    collectionOwner: Address;
    royaltyRate: bigint;
    totalSupply: bigint;
  }

  export type State = ContractState<Fields>;

  export interface CallMethodTable {
    getCollectionUri: {
      params: Omit<CallContractParams<{}>, "args">;
      result: CallContractResult<HexString>;
    };
    totalSupply: {
      params: Omit<CallContractParams<{}>, "args">;
      result: CallContractResult<bigint>;
    };
    nftByIndex: {
      params: CallContractParams<{ index: bigint }>;
      result: CallContractResult<HexString>;
    };
    royaltyAmount: {
      params: CallContractParams<{ tokenId: HexString; salePrice: bigint }>;
      result: CallContractResult<bigint>;
    };
    mint: {
      params: CallContractParams<{ nftUri: HexString }>;
      result: CallContractResult<HexString>;
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
  NFTCollectionWithRoyaltyTestInstance,
  NFTCollectionWithRoyaltyTestTypes.Fields
> {
  getInitialFieldsWithDefaultValues() {
    return this.contract.getInitialFieldsWithDefaultValues() as NFTCollectionWithRoyaltyTestTypes.Fields;
  }

  consts = {
    ErrorCodes: {
      IncorrectTokenIndex: BigInt(0),
      NFTNotFound: BigInt(1),
      NFTNotPartOfCollection: BigInt(2),
      CollectionOwnerAllowedOnly: BigInt(1),
    },
  };

  at(address: string): NFTCollectionWithRoyaltyTestInstance {
    return new NFTCollectionWithRoyaltyTestInstance(address);
  }

  tests = {
    getCollectionUri: async (
      params: Omit<
        TestContractParams<NFTCollectionWithRoyaltyTestTypes.Fields, never>,
        "testArgs"
      >
    ): Promise<TestContractResult<HexString, {}>> => {
      return testMethod(this, "getCollectionUri", params);
    },
    totalSupply: async (
      params: Omit<
        TestContractParams<NFTCollectionWithRoyaltyTestTypes.Fields, never>,
        "testArgs"
      >
    ): Promise<TestContractResult<bigint, {}>> => {
      return testMethod(this, "totalSupply", params);
    },
    nftByIndex: async (
      params: TestContractParams<
        NFTCollectionWithRoyaltyTestTypes.Fields,
        { index: bigint }
      >
    ): Promise<TestContractResult<HexString, {}>> => {
      return testMethod(this, "nftByIndex", params);
    },
    validateNFT: async (
      params: TestContractParams<
        NFTCollectionWithRoyaltyTestTypes.Fields,
        { nftId: HexString; nftIndex: bigint }
      >
    ): Promise<TestContractResult<null, {}>> => {
      return testMethod(this, "validateNFT", params);
    },
    royaltyAmount: async (
      params: TestContractParams<
        NFTCollectionWithRoyaltyTestTypes.Fields,
        { tokenId: HexString; salePrice: bigint }
      >
    ): Promise<TestContractResult<bigint, {}>> => {
      return testMethod(this, "royaltyAmount", params);
    },
    payRoyalty: async (
      params: TestContractParams<
        NFTCollectionWithRoyaltyTestTypes.Fields,
        { payer: Address; amount: bigint }
      >
    ): Promise<TestContractResult<null, {}>> => {
      return testMethod(this, "payRoyalty", params);
    },
    withdrawRoyalty: async (
      params: TestContractParams<
        NFTCollectionWithRoyaltyTestTypes.Fields,
        { recipient: Address; amount: bigint }
      >
    ): Promise<TestContractResult<null, {}>> => {
      return testMethod(this, "withdrawRoyalty", params);
    },
    mint: async (
      params: TestContractParams<
        NFTCollectionWithRoyaltyTestTypes.Fields,
        { nftUri: HexString }
      >
    ): Promise<TestContractResult<HexString, {}>> => {
      return testMethod(this, "mint", params);
    },
  };
}

// Use this object to test and deploy the contract
export const NFTCollectionWithRoyaltyTest = new Factory(
  Contract.fromJson(
    NFTCollectionWithRoyaltyTestContractJson,
    "",
    "1c162da87d31289c9b392bd48767386336bb1d208101a8680d92b7dc74098ce0",
    AllStructs,
    AllGeneratedContracts
  )
);

// Use this class to interact with the blockchain
export class NFTCollectionWithRoyaltyTestInstance extends ContractInstance {
  constructor(address: Address) {
    super(address);
  }

  async fetchState(): Promise<NFTCollectionWithRoyaltyTestTypes.State> {
    return fetchContractState(NFTCollectionWithRoyaltyTest, this);
  }

  methods = {
    getCollectionUri: async (
      params?: NFTCollectionWithRoyaltyTestTypes.CallMethodParams<"getCollectionUri">
    ): Promise<
      NFTCollectionWithRoyaltyTestTypes.CallMethodResult<"getCollectionUri">
    > => {
      return callMethod(
        NFTCollectionWithRoyaltyTest,
        this,
        "getCollectionUri",
        params === undefined ? {} : params,
        getContractByCodeHash
      );
    },
    totalSupply: async (
      params?: NFTCollectionWithRoyaltyTestTypes.CallMethodParams<"totalSupply">
    ): Promise<
      NFTCollectionWithRoyaltyTestTypes.CallMethodResult<"totalSupply">
    > => {
      return callMethod(
        NFTCollectionWithRoyaltyTest,
        this,
        "totalSupply",
        params === undefined ? {} : params,
        getContractByCodeHash
      );
    },
    nftByIndex: async (
      params: NFTCollectionWithRoyaltyTestTypes.CallMethodParams<"nftByIndex">
    ): Promise<
      NFTCollectionWithRoyaltyTestTypes.CallMethodResult<"nftByIndex">
    > => {
      return callMethod(
        NFTCollectionWithRoyaltyTest,
        this,
        "nftByIndex",
        params,
        getContractByCodeHash
      );
    },
    royaltyAmount: async (
      params: NFTCollectionWithRoyaltyTestTypes.CallMethodParams<"royaltyAmount">
    ): Promise<
      NFTCollectionWithRoyaltyTestTypes.CallMethodResult<"royaltyAmount">
    > => {
      return callMethod(
        NFTCollectionWithRoyaltyTest,
        this,
        "royaltyAmount",
        params,
        getContractByCodeHash
      );
    },
    mint: async (
      params: NFTCollectionWithRoyaltyTestTypes.CallMethodParams<"mint">
    ): Promise<NFTCollectionWithRoyaltyTestTypes.CallMethodResult<"mint">> => {
      return callMethod(
        NFTCollectionWithRoyaltyTest,
        this,
        "mint",
        params,
        getContractByCodeHash
      );
    },
  };

  async multicall<
    Calls extends NFTCollectionWithRoyaltyTestTypes.MultiCallParams
  >(
    calls: Calls
  ): Promise<NFTCollectionWithRoyaltyTestTypes.MultiCallResults<Calls>> {
    return (await multicallMethods(
      NFTCollectionWithRoyaltyTest,
      this,
      calls,
      getContractByCodeHash
    )) as NFTCollectionWithRoyaltyTestTypes.MultiCallResults<Calls>;
  }
}
