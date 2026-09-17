-- CreateTable
CREATE TABLE "sys_dict_type" (
    "id" UUID NOT NULL,
    "dict_name" VARCHAR(100) NOT NULL,
    "dict_type" VARCHAR(100) NOT NULL,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "remark" VARCHAR(255),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "deleted" SMALLINT NOT NULL DEFAULT 0,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_dict_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_dict_data" (
    "id" UUID NOT NULL,
    "dict_type" VARCHAR(100) NOT NULL,
    "dict_label" VARCHAR(100) NOT NULL,
    "dict_value" VARCHAR(100) NOT NULL,
    "css_class" VARCHAR(50),
    "is_default" SMALLINT NOT NULL DEFAULT 0,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "remark" VARCHAR(255),
    "deleted" SMALLINT NOT NULL DEFAULT 0,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_dict_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sys_dict_type_dict_type_key" ON "sys_dict_type"("dict_type");

-- CreateIndex
CREATE INDEX "sys_dict_data_dict_type_idx" ON "sys_dict_data"("dict_type");
