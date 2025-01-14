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
import { Parser } from 'binary-parser'
import { Codec, assert } from './codec'
import { BigIntCodec } from './bigint-codec'
import { binToHex } from '../utils'

export class CompactInt {
  static readonly oneBytePrefix = 0x00
  static readonly oneByteNegPrefix = 0xc0
  static readonly twoBytePrefix = 0x40
  static readonly twoByteNegPrefix = 0x80
  static readonly fourBytePrefix = 0x80
  static readonly fourByteNegPrefix = 0x40
  static readonly multiBytePrefix = 0xc0
}

const maskRest = 0xc0
const maskMode = 0x3f
const maskModeNeg = 0xffffffc0
const signFlag = 0x20 // 0b00100000

export interface DecodedCompactInt {
  mode: number
  rest: Uint8Array
}

const compactIntParser = new Parser().uint8('mode').buffer('rest', {
  length: function (ctx) {
    const rawMode = this['mode']
    const mode = rawMode & maskRest

    switch (mode) {
      case CompactInt.oneBytePrefix:
        return 0
      case CompactInt.twoBytePrefix:
        return 1
      case CompactInt.fourBytePrefix:
        return 3
      default:
        return (rawMode & maskMode) + 4
    }
  }
})

export class CompactUnsignedIntCodec implements Codec<DecodedCompactInt> {
  private oneByteBound = 0x40
  private twoByteBound = this.oneByteBound << 8
  private fourByteBound = this.oneByteBound << (8 * 3)

  parser = compactIntParser

  encode(input: DecodedCompactInt): Uint8Array {
    return new Uint8Array([input.mode, ...input.rest])
  }

  encodeU32(value: number): Uint8Array {
    if (value < this.oneByteBound) {
      return new Uint8Array([(CompactInt.oneBytePrefix + value) & 0xff])
    } else if (value < this.twoByteBound) {
      return new Uint8Array([(CompactInt.twoBytePrefix + (value >> 8)) & 0xff, value & 0xff])
    } else if (value < this.fourByteBound) {
      return new Uint8Array([
        (CompactInt.fourBytePrefix + (value >> 24)) & 0xff,
        (value >> 16) & 0xff,
        (value >> 8) & 0xff,
        value & 0xff
      ])
    } else {
      return new Uint8Array([
        CompactInt.multiBytePrefix,
        (value >> 24) & 0xff,
        (value >> 16) & 0xff,
        (value >> 8) & 0xff,
        value & 0xff
      ])
    }
  }

  encodeU256(value: bigint): Uint8Array {
    assert(value >= 0n, 'Value should be positive')

    if (value < this.fourByteBound) {
      return this.encodeU32(Number(value))
    } else {
      let bytes = BigIntCodec.encode(value)
      if (bytes[0] === 0) {
        bytes = bytes.slice(1)
      }

      assert(bytes.length <= 32, 'Expect <= 32 bytes for U256')

      const header = (bytes.length - 4 + CompactInt.multiBytePrefix) & 0xff
      return new Uint8Array([header, ...bytes])
    }
  }

  decodeU32(input: Uint8Array): number {
    const decoded = this.decode(input)
    return this.toU32(decoded)
  }

  decodeU256(input: Uint8Array): bigint {
    const decoded = this.decode(input)
    return this.toU256(decoded)
  }

  decode(input: Uint8Array): DecodedCompactInt {
    return this.parser.parse(input)
  }

  toU32(value: DecodedCompactInt): number {
    const body = new Uint8Array([value.mode, ...value.rest])
    return decodePositiveInt(value.mode, body)
  }

  fromU32(value: number): DecodedCompactInt {
    return this.decode(this.encodeU32(value))
  }

  toU256(value: DecodedCompactInt): bigint {
    const mode = value.mode & maskRest
    if (fixedSize(mode)) {
      return BigInt(this.toU32(value))
    } else {
      assert(value.rest.length <= 32, 'Expect <= 32 bytes for U256')
      return BigIntCodec.decode(value.rest, false)
    }
  }

  fromU256(value: bigint): DecodedCompactInt {
    return this.decode(this.encodeU256(value))
  }
}

export const compactUnsignedIntCodec = new CompactUnsignedIntCodec()

export class CompactSignedIntCodec implements Codec<DecodedCompactInt> {
  private signFlag = 0x20 // 0b00100000
  private oneByteBound = 0x20 // 0b00100000
  private twoByteBound = this.oneByteBound << 8
  private fourByteBound = this.oneByteBound << (8 * 3)

  parser = compactIntParser

  encode(input: DecodedCompactInt): Uint8Array {
    return new Uint8Array([input.mode, ...input.rest])
  }

  decode(input: Uint8Array): DecodedCompactInt {
    return this.parser.parse(input)
  }

  decodeI32(input: Uint8Array): number {
    const decoded = this.decode(input)
    return this.toI32(decoded)
  }

  encodeI32(value: number): Uint8Array {
    if (value >= 0) {
      if (value < this.oneByteBound) {
        return new Uint8Array([(CompactInt.oneBytePrefix + value) & 0xff])
      } else if (value < this.twoByteBound) {
        return new Uint8Array([(CompactInt.twoBytePrefix + (value >> 8)) & 0xff, value & 0xff])
      } else if (value < this.fourByteBound) {
        return new Uint8Array([
          (CompactInt.fourBytePrefix + (value >> 24)) & 0xff,
          (value >> 16) & 0xff,
          (value >> 8) & 0xff,
          value & 0xff
        ])
      } else {
        return new Uint8Array([
          CompactInt.multiBytePrefix,
          (value >> 24) & 0xff,
          (value >> 16) & 0xff,
          (value >> 8) & 0xff,
          value & 0xff
        ])
      }
    } else {
      if (value >= -this.oneByteBound) {
        return new Uint8Array([(value ^ CompactInt.oneByteNegPrefix) & 0xff])
      } else if (value >= -this.twoByteBound) {
        return new Uint8Array([((value >> 8) ^ CompactInt.twoByteNegPrefix) & 0xff, value & 0xff])
      } else if (value >= -this.fourByteBound) {
        return new Uint8Array([
          ((value >> 24) ^ CompactInt.fourByteNegPrefix) & 0xff,
          (value >> 16) & 0xff,
          (value >> 8) & 0xff,
          value & 0xff
        ])
      } else {
        return new Uint8Array([
          CompactInt.multiBytePrefix,
          (value >> 24) & 0xff,
          (value >> 16) & 0xff,
          (value >> 8) & 0xff,
          value & 0xff
        ])
      }
    }
  }

  encodeI256(value: bigint): Uint8Array {
    if (value >= -0x20000000 && value < 0x20000000) {
      return this.encodeI32(Number(value))
    } else {
      const bytes = BigIntCodec.encode(value)
      const header = (bytes.length - 4 + CompactInt.multiBytePrefix) & 0xff
      return new Uint8Array([header, ...bytes])
    }
  }

  decodeI256(input: Uint8Array): bigint {
    const decoded = this.decode(input)
    return this.toI256(decoded)
  }

  toI32(value: DecodedCompactInt): number {
    const body = new Uint8Array([value.mode, ...value.rest])
    const mode = value.mode & maskRest
    if (fixedSize(mode)) {
      const isPositive = (value.mode & signFlag) == 0
      if (isPositive) {
        return decodePositiveInt(value.mode, body)
      } else {
        return decodeNegativeInt(value.mode, body)
      }
    } else {
      if (body.length === 5) {
        return ((body[1] & 0xff) << 24) | ((body[2] & 0xff) << 16) | ((body[3] & 0xff) << 8) | (body[4] & 0xff)
      } else {
        throw new Error(`Expect 4 bytes int, but get ${body.length - 1} bytes int`)
      }
    }
  }

  fromI32(value: number): DecodedCompactInt {
    return this.decode(this.encodeI32(value))
  }

  toI256(value: DecodedCompactInt): bigint {
    const mode = value.mode & maskRest

    if (fixedSize(mode)) {
      return BigInt(this.toI32(value))
    } else {
      assert(value.rest.length <= 32, 'Expect <= 32 bytes for I256')
      return BigIntCodec.decode(value.rest, true)
    }
  }

  fromI256(value: bigint): DecodedCompactInt {
    return this.decode(this.encodeI256(value))
  }
}

export const compactSignedIntCodec = new CompactSignedIntCodec()

function decodePositiveInt(rawMode: number, body: Uint8Array): number {
  const mode = rawMode & maskRest

  switch (mode) {
    case CompactInt.oneBytePrefix:
      return rawMode
    case CompactInt.twoBytePrefix:
      assert(body.length === 2, 'Length should be 2')
      return ((body[0] & maskMode) << 8) | (body[1] & 0xff)
    case CompactInt.fourBytePrefix:
      assert(body.length === 4, 'Length should be 4')
      return ((body[0] & maskMode) << 24) | ((body[1] & 0xff) << 16) | ((body[2] & 0xff) << 8) | (body[3] & 0xff)
    default:
      if (body.length === 5) {
        return Number(BigInt('0x' + binToHex(body.slice(1))))
      } else {
        throw new Error(`decodePositiveInt: Expect 4 bytes int, but get ${body.length - 1} bytes int`)
      }
  }
}

function decodeNegativeInt(rawMode: number, body: Uint8Array) {
  const mode = rawMode & maskRest
  switch (mode) {
    case CompactInt.oneBytePrefix:
      return rawMode | maskModeNeg
    case CompactInt.twoBytePrefix:
      assert(body.length === 2, 'Length should be 2')
      return ((body[0] | maskModeNeg) << 8) | (body[1] & 0xff)
    case CompactInt.fourBytePrefix:
      assert(body.length === 4, 'Length should be 4')
      return ((body[0] | maskModeNeg) << 24) | ((body[1] & 0xff) << 16) | ((body[2] & 0xff) << 8) | (body[3] & 0xff)
    default:
      throw new Error(`decodeNegativeInt: Expect 4 bytes int, but get ${body.length - 1} bytes int`)
  }
}

function fixedSize(mode: number): boolean {
  return mode === CompactInt.oneBytePrefix || mode === CompactInt.twoBytePrefix || mode === CompactInt.fourBytePrefix
}
