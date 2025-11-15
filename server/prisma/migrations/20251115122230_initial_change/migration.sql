-- CreateTable
CREATE TABLE "log_request" (
    "id" SERIAL NOT NULL,
    "ref_id" VARCHAR(50) NOT NULL,
    "user_ref_id" VARCHAR(50),
    "provider" VARCHAR(25),
    "method" VARCHAR(10) NOT NULL,
    "intent" VARCHAR(255) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "payload" JSONB NOT NULL,
    "api_endpoint" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "status_code" INTEGER NOT NULL,
    "trace" JSONB NOT NULL,
    "started_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_ip" VARCHAR(255) NOT NULL,
    "client_headers" JSONB NOT NULL,
    "response_headers" JSONB NOT NULL,
    "is_error" BOOLEAN DEFAULT false,
    "error" JSONB,
    "via_provider" VARCHAR(25),
    "service_type" VARCHAR(25),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" SERIAL NOT NULL,
    "ref_id" VARCHAR(50),
    "provider_identifier" VARCHAR(50) NOT NULL,
    "provider_name" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50),
    "auth_type" VARCHAR(20),
    "auth_config" JSONB,
    "fields" JSONB,
    "presets" JSONB,
    "description" TEXT,
    "status" VARCHAR(255),
    "active" SMALLINT NOT NULL DEFAULT 1,
    "hidden" SMALLINT NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers_credential_and_tokens" (
    "id" SERIAL NOT NULL,
    "user_ref_id" VARCHAR(50),
    "provider" VARCHAR(20) NOT NULL,
    "auth_type" VARCHAR(20) NOT NULL,
    "config" JSONB,
    "provider_data" JSONB,
    "credentials" JSONB,
    "active" BOOLEAN DEFAULT true,
    "descriptions" TEXT,
    "remark" TEXT,
    "provider_error" JSONB,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_credential_and_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers_intent_default_payloads" (
    "id" SERIAL NOT NULL,
    "ref_id" VARCHAR(50) NOT NULL,
    "intent_ref_id" VARCHAR(50),
    "title" TEXT,
    "description" TEXT,
    "method" VARCHAR(10),
    "query_params" JSONB,
    "path_params" JSONB,
    "body" JSONB,
    "custom_headers" JSONB,
    "response_format" JSONB,
    "status" VARCHAR(10),
    "active" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_intent_default_payloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers_intents" (
    "id" SERIAL NOT NULL,
    "ref_id" VARCHAR(50) NOT NULL,
    "provider_id" VARCHAR(50),
    "text" TEXT,
    "provider_intent" TEXT,
    "provider_alias_intent" TEXT,
    "category" TEXT,
    "type" VARCHAR(10),
    "request_type" VARCHAR(25),
    "method" VARCHAR(10),
    "params" JSONB,
    "path_params" JSONB,
    "body" JSONB,
    "custom_headers" JSONB,
    "domain_params" JSONB,
    "meta" JSONB,
    "auth" JSONB,
    "response_format" JSONB,
    "status" VARCHAR(10),
    "active" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers_oauth_credentials" (
    "id" SERIAL NOT NULL,
    "user_ref_id" VARCHAR(50),
    "provider" VARCHAR(20) NOT NULL,
    "auth_type" VARCHAR(20) NOT NULL,
    "credentials" JSONB,
    "active" BOOLEAN DEFAULT true,
    "descriptions" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_oauth_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "ref_id" VARCHAR(255),
    "entity_id" INTEGER,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255),
    "company_name" VARCHAR(255),
    "phone" VARCHAR(255),
    "first_name" VARCHAR(255),
    "middle_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "profile_picture" VARCHAR(255),
    "avatars" JSONB,
    "gender" VARCHAR(255),
    "password_hash" VARCHAR(255),
    "user_token" VARCHAR(255),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "service_limit" INTEGER DEFAULT 2,
    "cache_duration" INTEGER DEFAULT 120,
    "full_access" BOOLEAN NOT NULL DEFAULT false,
    "billing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "country_code" VARCHAR(2) NOT NULL DEFAULT '',
    "extra" JSONB,
    "export_user" BOOLEAN,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "login_at" TIMESTAMP(0),
    "last_login_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) NOT NULL,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_activated_providers" (
    "id" SERIAL NOT NULL,
    "ref_id" VARCHAR(50),
    "user_ref_id" VARCHAR(50) NOT NULL,
    "provider_ref_id" VARCHAR(50) NOT NULL,
    "active" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_activated_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_api_tokens" (
    "id" SERIAL NOT NULL,
    "ref_id" VARCHAR(255) NOT NULL,
    "user_ref_id" VARCHAR(255) NOT NULL,
    "api_token" VARCHAR(255) NOT NULL,
    "api_token_credits" INTEGER DEFAULT 500,
    "api_credit_consumed" INTEGER DEFAULT 0,
    "last_used" TIMESTAMP(0),
    "api_token_expiry" INTEGER DEFAULT 90,
    "api_token_config" JSONB,
    "remark" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(0) NOT NULL,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "users_api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_login_intents" (
    "id" SERIAL NOT NULL,
    "ref_id" VARCHAR(255),
    "user_ref_id" VARCHAR(255) NOT NULL,
    "login_intent" VARCHAR(255) NOT NULL,
    "login_code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(0) NOT NULL,
    "login_at" TIMESTAMP(0),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_login_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_providers_intent_hydration" (
    "id" SERIAL NOT NULL,
    "user_ref_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "provider" VARCHAR(25) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "intent" VARCHAR(255) NOT NULL,
    "body" JSONB,
    "query_params" JSONB,
    "path_params" JSONB,
    "headers" JSONB,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_providers_intent_hydration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_providers_saved_intents" (
    "id" SERIAL NOT NULL,
    "user_ref_id" VARCHAR(50) NOT NULL,
    "provider" VARCHAR(25) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "intent" VARCHAR(255) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "saved_mode" VARCHAR(10) NOT NULL DEFAULT 'fav',
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_providers_saved_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_unified_config" (
    "id" SERIAL NOT NULL,
    "ref_id" VARCHAR(255),
    "user_ref_id" VARCHAR(255) NOT NULL,
    "unified_type" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(255),
    "json_config" JSONB,
    "remark" TEXT,
    "active" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_unified_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "log_request_provider_idx" ON "log_request"("provider");

-- CreateIndex
CREATE INDEX "log_request_ref_idx" ON "log_request"("ref_id");

-- CreateIndex
CREATE INDEX "log_request_user_ref_idx" ON "log_request"("user_ref_id");

-- CreateIndex
CREATE INDEX "providers_ref_idx" ON "providers"("ref_id");

-- CreateIndex
CREATE INDEX "providers_credential_and_tokens_provider_idx" ON "providers_credential_and_tokens"("provider");

-- CreateIndex
CREATE INDEX "providers_credential_and_tokens_user_ref_idx" ON "providers_credential_and_tokens"("user_ref_id");

-- CreateIndex
CREATE INDEX "providers_intent_default_payloads_intent_ref_idx" ON "providers_intent_default_payloads"("intent_ref_id");

-- CreateIndex
CREATE INDEX "providers_intent_default_payloads_method_idx" ON "providers_intent_default_payloads"("method");

-- CreateIndex
CREATE INDEX "providers_intent_default_payloads_ref_idx" ON "providers_intent_default_payloads"("ref_id");

-- CreateIndex
CREATE INDEX "providers_intents_category_idx" ON "providers_intents"("category");

-- CreateIndex
CREATE INDEX "providers_intents_method_idx" ON "providers_intents"("method");

-- CreateIndex
CREATE INDEX "providers_intents_provider_id_idx" ON "providers_intents"("provider_id");

-- CreateIndex
CREATE INDEX "providers_intents_ref_idx" ON "providers_intents"("ref_id");

-- CreateIndex
CREATE INDEX "providers_oauth_credentials_provider_idx" ON "providers_oauth_credentials"("provider");

-- CreateIndex
CREATE INDEX "providers_oauth_credentials_user_ref_idx" ON "providers_oauth_credentials"("user_ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "email" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_ref_idx" ON "users"("ref_id");

-- CreateIndex
CREATE INDEX "users_activated_providers_provider_ref_id" ON "users_activated_providers"("provider_ref_id");

-- CreateIndex
CREATE INDEX "users_activated_providers_ref_idx" ON "users_activated_providers"("ref_id");

-- CreateIndex
CREATE INDEX "users_activated_providers_user_ref_id" ON "users_activated_providers"("user_ref_id");

-- CreateIndex
CREATE INDEX "users_api_tokens_ref_idx" ON "users_api_tokens"("ref_id");

-- CreateIndex
CREATE INDEX "users_api_tokens_user_ref_idx" ON "users_api_tokens"("user_ref_id");

-- CreateIndex
CREATE INDEX "users_login_intents_ref_idx" ON "users_login_intents"("ref_id");

-- CreateIndex
CREATE INDEX "users_login_intents_user_ref_idx" ON "users_login_intents"("user_ref_id");

-- CreateIndex
CREATE INDEX "users_login_intents_login_code_hash_idx" ON "users_login_intents"("login_code_hash");

-- CreateIndex
CREATE INDEX "users_providers_intent_hydration_provider_idx" ON "users_providers_intent_hydration"("provider");

-- CreateIndex
CREATE INDEX "users_providers_intent_hydration_user_ref_idx" ON "users_providers_intent_hydration"("user_ref_id");

-- CreateIndex
CREATE INDEX "users_providers_intent_hydration_idx" ON "users_providers_intent_hydration"("intent");

-- CreateIndex
CREATE INDEX "users_providers_saved_intents_provider_idx" ON "users_providers_saved_intents"("provider");

-- CreateIndex
CREATE INDEX "users_providers_saved_intents_user_ref_idx" ON "users_providers_saved_intents"("user_ref_id");

-- CreateIndex
CREATE INDEX "users_providers_saved_intents_users_saved_intent_idx" ON "users_providers_saved_intents"("intent");

-- CreateIndex
CREATE INDEX "users_unified_config_ref_idx" ON "users_unified_config"("ref_id");

-- CreateIndex
CREATE INDEX "users_unified_config_unified_type_idx" ON "users_unified_config"("unified_type");

-- CreateIndex
CREATE INDEX "users_unified_config_user_ref_idx" ON "users_unified_config"("user_ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "fk_users_unified_config_idx" ON "users_unified_config"("user_ref_id", "unified_type");
