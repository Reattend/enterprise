import { NextResponse } from 'next/server'
import { TEAMS_BOT_APP_ID } from '@/lib/teams-recap'

export const dynamic = 'force-dynamic'

// Minimal 1x1 PNG (color: indigo #4F46E5) base64 — placeholder icons
// Teams requires 192x192 (color) and 32x32 (outline) PNGs in the manifest
// We generate simple solid-color PNGs inline
function createMinimalPNG(size: number): Buffer {
  // Create a minimal valid PNG with IHDR, IDAT, IEND
  // This creates a solid indigo square
  const width = size
  const height = size

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 2 // color type: RGB
  ihdrData[10] = 0 // compression
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // interlace
  const ihdr = createChunk('IHDR', ihdrData)

  // Raw image data: each row has filter byte (0) + RGB pixels
  const rowSize = 1 + width * 3
  const rawData = Buffer.alloc(rowSize * height)
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 3
      rawData[offset] = 79     // R: #4F
      rawData[offset + 1] = 70 // G: #46
      rawData[offset + 2] = 229 // B: #E5
    }
  }

  // Compress with zlib (deflate)
  const zlib = require('zlib')
  const compressed = zlib.deflateSync(rawData)
  const idat = createChunk('IDAT', compressed)

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

function createChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])

  // CRC32
  let crc = 0xFFFFFFFF
  for (let i = 0; i < crcData.length; i++) {
    crc ^= crcData[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  crc ^= 0xFFFFFFFF
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc >>> 0, 0)

  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

// Create a ZIP file with the manifest + icons
function createZip(files: { name: string; data: Buffer }[]): Buffer {
  const localHeaders: Buffer[] = []
  const centralHeaders: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, 'utf-8')

    // Local file header
    const local = Buffer.alloc(30 + nameBuffer.length + file.data.length)
    local.writeUInt32LE(0x04034b50, 0) // signature
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0, 6) // flags
    local.writeUInt16LE(0, 8) // compression: stored
    local.writeUInt16LE(0, 10) // mod time
    local.writeUInt16LE(0, 12) // mod date
    // CRC32 of file data
    let crc = 0xFFFFFFFF
    for (let i = 0; i < file.data.length; i++) {
      crc ^= file.data[i]
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
      }
    }
    crc ^= 0xFFFFFFFF
    local.writeUInt32LE(crc >>> 0, 14)
    local.writeUInt32LE(file.data.length, 18) // compressed size
    local.writeUInt32LE(file.data.length, 22) // uncompressed size
    local.writeUInt16LE(nameBuffer.length, 26) // name length
    local.writeUInt16LE(0, 28) // extra length
    nameBuffer.copy(local, 30)
    file.data.copy(local, 30 + nameBuffer.length)
    localHeaders.push(local)

    // Central directory header
    const central = Buffer.alloc(46 + nameBuffer.length)
    central.writeUInt32LE(0x02014b50, 0) // signature
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt16LE(0, 8) // flags
    central.writeUInt16LE(0, 10) // compression
    central.writeUInt16LE(0, 12) // mod time
    central.writeUInt16LE(0, 14) // mod date
    central.writeUInt32LE(crc >>> 0, 16)
    central.writeUInt32LE(file.data.length, 20)
    central.writeUInt32LE(file.data.length, 24)
    central.writeUInt16LE(nameBuffer.length, 28)
    central.writeUInt16LE(0, 30) // extra length
    central.writeUInt16LE(0, 32) // comment length
    central.writeUInt16LE(0, 34) // disk start
    central.writeUInt16LE(0, 36) // internal attrs
    central.writeUInt32LE(0, 38) // external attrs
    central.writeUInt32LE(offset, 42) // local header offset
    nameBuffer.copy(central, 46)
    centralHeaders.push(central)

    offset += local.length
  }

  const centralDirOffset = offset
  const centralDir = Buffer.concat(centralHeaders)
  const centralDirSize = centralDir.length

  // End of central directory record
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // signature
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // central dir disk
  eocd.writeUInt16LE(files.length, 8) // entries on disk
  eocd.writeUInt16LE(files.length, 10) // total entries
  eocd.writeUInt32LE(centralDirSize, 12) // central dir size
  eocd.writeUInt32LE(centralDirOffset, 16) // central dir offset
  eocd.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([...localHeaders, centralDir, eocd])
}

export async function GET() {
  if (!TEAMS_BOT_APP_ID) {
    return NextResponse.json(
      { error: 'Bot not configured' },
      { status: 500 }
    )
  }

  const manifest = {
    $schema:
      'https://developer.microsoft.com/en-us/json-schemas/teams/v1.16/MicrosoftTeams.schema.json',
    manifestVersion: '1.16',
    version: '1.0.0',
    id: TEAMS_BOT_APP_ID,
    developer: {
      name: 'Reattend',
      websiteUrl: 'https://reattend.com',
      privacyUrl: 'https://reattend.com/privacy',
      termsOfUseUrl: 'https://reattend.com/terms',
    },
    name: {
      short: 'Meeting Recap',
      full: 'Meeting Recap by Reattend',
    },
    description: {
      short: 'Free meeting recap collector for Teams',
      full: 'Capture meeting decisions, action items, and notes from your team — all in one place. A free alternative to Microsoft Copilot meeting recaps. After any meeting, mention @Recap recap and everyone can fill in what was decided and what needs to happen next. Compile it into a clean summary with @Recap done.',
    },
    icons: {
      color: 'color.png',
      outline: 'outline.png',
    },
    accentColor: '#4F46E5',
    bots: [
      {
        botId: TEAMS_BOT_APP_ID,
        scopes: ['team', 'personal', 'groupChat'],
        commandLists: [
          {
            scopes: ['team', 'groupChat'],
            commands: [
              {
                title: 'recap',
                description: 'Start a new meeting recap form',
              },
              {
                title: 'done',
                description: 'Compile and post the recap summary',
              },
              {
                title: 'help',
                description: 'Show help and available commands',
              },
            ],
          },
        ],
        supportsFiles: false,
        isNotificationOnly: false,
      },
    ],
    permissions: ['identity', 'messageTeamMembers'],
    validDomains: ['reattend.com'],
  }

  const manifestJson = Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8')
  const colorIcon = createMinimalPNG(192)
  const outlineIcon = createMinimalPNG(32)

  const zip = createZip([
    { name: 'manifest.json', data: manifestJson },
    { name: 'color.png', data: colorIcon },
    { name: 'outline.png', data: outlineIcon },
  ])

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="meeting-recap-teams-app.zip"',
    },
  })
}
