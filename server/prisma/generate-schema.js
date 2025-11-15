#!/usr/bin/env node

/**
 * Schema Generator Script
 * 
 * Generates the appropriate Prisma schema from a single base schema file
 * by transforming provider-specific differences based on DATABASE_URL or DB_PROVIDER.
 * 
 * Usage:
 *   node generate-schema.js
 *   DB_PROVIDER=postgresql node generate-schema.js
 */

// Load environment variables from .env file
// Look for .env in project root (two levels up from this script)
const path = require('path');
const fs = require('fs');
const projectRoot = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });

const SCHEMA_DIR = __dirname;
const BASE_SCHEMA = path.join(SCHEMA_DIR, 'schema.base.prisma');
const OUTPUT_SCHEMA = path.join(SCHEMA_DIR, 'schema.prisma');

/**
 * Detects database provider from environment variables
 */
function getDatabaseProvider() {
  // Check explicit DB_PROVIDER first
  if (process.env.DB_PROVIDER) {
    return process.env.DB_PROVIDER.toLowerCase();
  }
  
  console.log('DATABASE_URL', process.env.DATABASE_URL);
  // Check DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL || '';
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    return 'postgresql';
  }
  
  // Default to MySQL
  return 'mysql';
}

/**
 * Transforms the base schema for the target database provider
 */
function transformSchemaForProvider(schemaContent, provider) {
  let transformed = schemaContent;
  
  // 1. Replace provider in datasource
  transformed = transformed.replace(
    /provider = "mysql"/,
    `provider = "${provider}"`
  );
  
  if (provider === 'postgresql') {
    // 2. Replace TinyInt with SmallInt (PostgreSQL doesn't have TinyInt)
    transformed = transformed.replace(/@db\.TinyInt/g, '@db.SmallInt');
    
    // 3. Replace DateTime with Timestamp for PostgreSQL
    // Note: We only replace @db.DateTime(0), not @db.Timestamp(0) which already works in both
    transformed = transformed.replace(/@db\.DateTime\(0\)/g, '@db.Timestamp(0)');
    
    // 4. Remove length argument from indexes (PostgreSQL doesn't support it)
    // Match (length: n) within index column definitions like [category(length: 50)]
    transformed = transformed.replace(/\[([^\]]*?)\(length:\s*\d+\)([^\]]*?)\]/g, '[$1$2]');
    
    // 5. Make index names globally unique by prefixing with model name
    // Process line by line to track which model we're in
    const lines = transformed.split('\n');
    let currentModel = null;
    let braceCount = 0;
    const transformedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect model start
      const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
      if (modelMatch) {
        currentModel = modelMatch[1];
        braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        transformedLines.push(line);
        continue;
      }
      
      // Track braces to know when we exit a model
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceCount += openBraces - closeBraces;
      
      if (braceCount === 0 && currentModel) {
        currentModel = null;
      }
      
      // Update index map names within models
      if (currentModel && line.includes('@@index') && line.includes('map:')) {
        // Replace map name with model-prefixed version
        const updatedLine = line.replace(
          /(map:\s*")([^"]+)(")/,
          (match, prefix, mapName, suffix) => {
            // Skip if already prefixed or if it's a unique constraint
            if (mapName.startsWith(`${currentModel}_`) || line.includes('@@unique')) {
              return match;
            }
            return `${prefix}${currentModel}_${mapName}${suffix}`;
          }
        );
        transformedLines.push(updatedLine);
      } else {
        transformedLines.push(line);
      }
    }
    
    transformed = transformedLines.join('\n');
  }
  
  return transformed;
}

/**
 * Generates schema.prisma from the base schema, transforming for the target provider
 */
function generateSchema() {
  const provider = getDatabaseProvider();
  
  console.log(`🔍 Detected database provider: ${provider}`);
  
  // Check if base schema exists
  if (!fs.existsSync(BASE_SCHEMA)) {
    console.error(`❌ Error: Base schema file not found: ${BASE_SCHEMA}`);
    console.error(`   Please create schema.base.prisma first.`);
    process.exit(1);
  }
  
  // Read base schema
  const baseSchemaContent = fs.readFileSync(BASE_SCHEMA, 'utf-8');
  
  // Transform for the target provider
  const transformedSchema = transformSchemaForProvider(baseSchemaContent, provider);
  
  // Write to output schema
  fs.writeFileSync(OUTPUT_SCHEMA, transformedSchema, 'utf-8');
  
  console.log(`✅ Generated schema.prisma from schema.base.prisma`);
  console.log(`   Provider: ${provider}`);
  
  if (provider === 'postgresql') {
    console.log(`   Transformations applied:`);
    console.log(`   - TinyInt → SmallInt`);
    console.log(`   - DateTime → Timestamp`);
  }
}

// Run if executed directly
if (require.main === module) {
  generateSchema();
}

module.exports = { generateSchema, getDatabaseProvider };

