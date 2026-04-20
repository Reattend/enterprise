import { Metadata } from 'next'
import McpContent from './mcp-content'

export const metadata: Metadata = {
  title: 'MCP Server - Persistent Memory for Claude, Cursor, and AI Tools',
  description: 'Connect Reattend to Claude Desktop, Cursor, and any MCP-compatible AI tool. Your meetings, notes, and decisions become searchable memory in every AI conversation.',
  alternates: { canonical: 'https://reattend.com/mcp' },
}

export default function McpPage() {
  return <McpContent />
}
