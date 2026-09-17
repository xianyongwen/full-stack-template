import type { SysDictData, SysDictType } from "@/generated/prisma/client";

/** 字典类型 VO（去掉 deleted/updateTime） */
export interface DictTypeVO {
  id: string;
  dictName: string;
  dictType: string;
  status: number;
  sort: number;
  remark: string | null;
  createTime: string;
}

/** 字典数据 VO（去掉 deleted/updateTime） */
export interface DictDataVO {
  id: string;
  dictType: string;
  dictLabel: string;
  dictValue: string;
  cssClass: string | null;
  isDefault: number;
  sort: number;
  status: number;
  remark: string | null;
  createTime: string;
}

export function toDictTypeVO(t: SysDictType): DictTypeVO {
  return {
    id: t.id,
    dictName: t.dictName,
    dictType: t.dictType,
    status: t.status,
    sort: t.sort,
    remark: t.remark,
    createTime: t.createTime.toISOString(),
  };
}

export function toDictDataVO(d: SysDictData): DictDataVO {
  return {
    id: d.id,
    dictType: d.dictType,
    dictLabel: d.dictLabel,
    dictValue: d.dictValue,
    cssClass: d.cssClass,
    isDefault: d.isDefault,
    sort: d.sort,
    status: d.status,
    remark: d.remark,
    createTime: d.createTime.toISOString(),
  };
}
