# Prisma Schema Management

## Single Schema File with Automatic Transformations ✅

**You only need to maintain ONE schema file!** The system automatically transforms it for MySQL or PostgreSQL based on your `DATABASE_URL`.

### Files

- **`schema.base.prisma`** - Single source of truth (edit this file)
- **`schema.prisma`** - Generated file (auto-created, don't edit)
- **`generate-schema.js`** - Auto-detection and transformation script

### Quick Start

```bash
# Generate Prisma Client (auto-detects provider from DATABASE_URL)
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

### Manual Provider Selection

```bash
# Force MySQL
DB_PROVIDER=mysql npm run prisma:generate

# Force PostgreSQL
DB_PROVIDER=postgresql npm run prisma:generate
```

### Schema Differences

| MySQL | PostgreSQL |
|-------|------------|
| `provider = "mysql"` | `provider = "postgresql"` |
| `@db.TinyInt` | `@db.SmallInt` |
| `@db.DateTime(0)` | `@db.Timestamp(0)` |

### Important Notes

- ✅ **Only commit** `schema.base.prisma` (single source of truth)
- ❌ **Don't commit** `schema.prisma` (add to `.gitignore`)
- 🔄 **Edit only** `schema.base.prisma` - transformations happen automatically

