import { dictRepository } from "./dict.repository.ts";
import { toDictDataVO, toDictTypeVO } from "./dict.mapper.ts";
import { buildPageResult } from "@/common/types/page";
import {
  BusinessError,
  NotFoundError,
} from "@/common/errors/index";
import type {
  CreateDictDataDTO,
  CreateDictTypeDTO,
  ListDictDataQuery,
  ListDictTypeQuery,
  UpdateDictDataDTO,
  UpdateDictTypeDTO,
} from "./dict.schema.ts";

export const dictService = {
  // ── 字典类型 ──

  async typeList(query: ListDictTypeQuery) {
    const where = {
      deleted: 0,
      ...(query.dictName ? { dictName: { contains: query.dictName } } : {}),
      ...(query.dictType ? { dictType: { contains: query.dictType } } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
    };
    const [rows, total] = await dictRepository.paginateType({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return buildPageResult(rows.map(toDictTypeVO), total, query);
  },

  /** 启用的字典类型（下拉用） */
  async typeOptions() {
    const rows = await dictRepository.findEnabledTypes();
    return rows.map(toDictTypeVO);
  },

  async typeDetail(id: string) {
    const t = await dictRepository.findTypeById(id);
    if (!t) throw new NotFoundError("字典类型不存在");
    return toDictTypeVO(t);
  },

  async typeCreate(dto: CreateDictTypeDTO) {
    const exists = await dictRepository.findTypeByCode(dto.dictType);
    if (exists) throw new BusinessError("字典类型已存在", "DICT_TYPE_EXISTS");
    const created = await dictRepository.createType(dto);
    return toDictTypeVO(created);
  },

  async typeUpdate(id: string, dto: UpdateDictTypeDTO) {
    const t = await dictRepository.findTypeById(id);
    if (!t) throw new NotFoundError("字典类型不存在");
    const updated = await dictRepository.updateType(id, dto);
    return toDictTypeVO(updated);
  },

  async typeRemove(id: string) {
    const t = await dictRepository.findTypeById(id);
    if (!t) throw new NotFoundError("字典类型不存在");
    const dataCount = await dictRepository.countData(t.dictType);
    if (dataCount > 0)
      throw new BusinessError("该字典类型下仍有数据，无法删除");
    await dictRepository.softDeleteType(id);
  },

  // ── 字典数据 ──

  async dataList(query: ListDictDataQuery) {
    const rows = await dictRepository.findDataList(query);
    return rows.map(toDictDataVO);
  },

  async dataDetail(id: string) {
    const d = await dictRepository.findDataById(id);
    if (!d) throw new NotFoundError("字典数据不存在");
    return toDictDataVO(d);
  },

  async dataCreate(dto: CreateDictDataDTO) {
    // 校验字典类型存在
    const type = await dictRepository.findTypeByCode(dto.dictType);
    if (!type) throw new NotFoundError("字典类型不存在");
    const created = await dictRepository.createData(dto);
    return toDictDataVO(created);
  },

  async dataUpdate(id: string, dto: UpdateDictDataDTO) {
    const d = await dictRepository.findDataById(id);
    if (!d) throw new NotFoundError("字典数据不存在");
    const updated = await dictRepository.updateData(id, dto);
    return toDictDataVO(updated);
  },

  async dataRemove(id: string) {
    const d = await dictRepository.findDataById(id);
    if (!d) throw new NotFoundError("字典数据不存在");
    await dictRepository.softDeleteData(id);
  },
};
