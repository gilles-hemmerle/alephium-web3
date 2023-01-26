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

import { Decoder } from './codec'

const hexMap: Record<string, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  a: 10,
  b: 11,
  c: 12,
  d: 13,
  e: 14,
  f: 15,
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15
}

// Convert a hex string to a  byte array
export function hexTobytes(hexString: string): Uint8Array {
  const isOdd = hexString.length % 2

  const base = (hexString[1] === 'x' ? 2 : 0) + isOdd
  const nBytes = (hexString.length - base) / 2 + isOdd
  const bytes = new Uint8Array(nBytes)

  if (isOdd) bytes[0] = 0 | hexMap[hexString[2]]

  for (let i = 0; i < nBytes; ) {
    const idx = base + i * 2
    const a = hexMap[hexString[idx]]
    const b = hexMap[hexString[idx + 1]]
    bytes[isOdd + i++] = (a << 4) | b
  }
  return bytes
}

// Convert a byte array to a hex string
export function bytesToHex(bytes: ArrayBuffer): string {
  const hex: Array<string> = []
  for (let i = 0; i < bytes.byteLength; i++) {
    const current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i]
    hex.push((current >> 4).toString(16))
    hex.push((current & 0xf).toString(16))
  }
  return '0x' + hex.join('')
}

class ByteArray extends Int8Array {
  // cursor = 0
  pos = 0

  constructor(buffer: ArrayBuffer) {
    super(buffer)
  }
}

export const byteArray =
  <T>(fn: (input: ByteArray) => T): Decoder<T> =>
  (buffer: string | ArrayBuffer | Int8Array | Uint8Array | ByteArray) => {
    return fn(
      buffer instanceof ByteArray ? buffer : new ByteArray(typeof buffer === 'string' ? hexTobytes(buffer) : buffer)
    )
  }
