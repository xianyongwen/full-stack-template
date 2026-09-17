import { getClient } from "@/prisma/transaction-context";
import type {
  CreateDictDataDTO,
  CreateDictTypeDTO,
  ListDictDataQuery,
  ListDictTypeQuery,
  UpdateDictDataDTO,
  UpdateDictTypeDTO,
} from "./dict.schema.ts";

export const dictRepository = {
  // ── 字典类型 ──

  paginateType(args: { where: any; skip: number; take: number }) {
    return Promise.all([
      getClient().sysDictType.findMany({
        where: args.where,
        skip: args.skip,
        take: args.take,
        orderBy: [{ sort: "asc" }, { createTime: "desc" }],
      }),
      getClient().sysDictType.count({ where: args.where }),
    ]);
  },

  findTypeById(id: string) {
    return getClient().sysDictType.findFirst({ where: { id, deleted: 0 } });
  },

  findTypeByCode(dictType: string) {
    return getClient().sysDictType.findFirst({
      where: { dictType, deleted: 0 },
    });
  },

  /** 启用的全部字典类型（供下拉选择） */
  findEnabledTypes() {
    return getClient().sysDictType.findMany({
      where: { deleted: 0, status: 1 },
      orderBy: [{ sort: "asc" }, { createTime: "asc" }],
      take: 500,
    });
  },

  createType(data: CreateDictTypeDTO) {
    return getClient().sysDictType.create({ data });
  },

  updateType(id: string, data: UpdateDictTypeDTO) {
    return getClient().sysDictType.update({ where: { id }, data });
  },

  softDeleteType(id: string) {
    return getClient().sysDictType.update({
      where: { id },
      data: { deleted: 1 },
    });
  },

  /** 某字典类型下的数据项数量（删除类型时校验） */
  countData(dictType: string) {
    return getClient().sysDictData.count({
      where: { dictType, deleted: 0 },
    });
  },

  // ── 字典数据 ──

  findDataList(query: ListDictDataQuery) {
    return getClient().sysDictData.findMany({
      where: {
        deleted: 0,
        dictType: query.dictType,
        ...(query.dictLabel
          ? { dictLabel: { contains: query.dictLabel } }
          : {}),
        ...(query.status !== undefined ? { status: query.status } : {}),
      },
      orderBy: [{ sort: "asc" }, { createTime: "asc" }],
    });
  },

  findDataById(id: string) {
    return getClient().sysDictData.findFirst({
      where: { id, deleted: 0 },
    });
  },

  createData(data: CreateDictDataDTO) {
    return getClient().sysDictData.create({ data });
  },

  updateData(id: string, data: UpdateDictDataDTO) {
    return getClient().sysDictData.update({ where: { id }, data });
  },

  softDeleteData(id: string) {
    return getClient().sysDictData.update({
      where: { id },
      data: { deleted: 1 },
    });
  },
};
