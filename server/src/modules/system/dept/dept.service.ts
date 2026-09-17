import type { SysDept } from "@/generated/prisma/client";
import { NIL_UUID } from "@/common/constants/system";
import { deptRepository } from "./dept.repository.ts";
import { toDeptTree } from "./dept.mapper.ts";
import {
  BusinessError,
  NotFoundError,
} from "@/common/errors/index";
import type { CreateDeptDTO, ListDeptQuery, UpdateDeptDTO } from "./dept.schema.ts";

export const deptService = {
  /** 部门树：支持按名称/状态过滤，匹配项及其所有祖先节点都会返回，保证树结构完整 */
  async tree(query?: ListDeptQuery) {
    const all = await deptRepository.findMany();
    const hasFilter =
      !!query?.deptName || query?.status !== undefined;
    if (!hasFilter) {
      return toDeptTree(all);
    }
    const name = query?.deptName?.trim();
    const status = query?.status;

    // 1. 找出满足条件的节点
    const matched = all.filter((d) => {
      const okName = !name || d.deptName.includes(name);
      const okStatus = status === undefined || d.status === status;
      return okName && okStatus;
    });

    // 2. 收集匹配节点的所有祖先 id，保证树链路完整
    const byId = new Map(all.map((d) => [d.id, d] as const));
    const keep = new Set<string>();
    for (const m of matched) {
      keep.add(m.id);
      let cur = byId.get(m.parentId);
      while (cur && !keep.has(cur.id)) {
        keep.add(cur.id);
        cur = byId.get(cur.parentId);
      }
    }

    // 3. 用保留的节点构建树
    return toDeptTree(all.filter((d) => keep.has(d.id)));
  },

  /** 新建部门 */
  async create(dto: CreateDeptDTO) {
    if (dto.parentId !== NIL_UUID) {
      const parent = await deptRepository.findById(dto.parentId);
      if (!parent) throw new NotFoundError("父部门不存在");
    }
    const created = await deptRepository.create(dto);
    return {
      id: created.id,
      parentId: created.parentId,
      deptName: created.deptName,
      sort: created.sort,
      status: created.status,
      createTime: created.createTime.toISOString(),
    };
  },

  /** 更新部门 */
  async update(id: string, dto: UpdateDeptDTO) {
    const dept = await deptRepository.findById(id);
    if (!dept) throw new NotFoundError("部门不存在");
    if (dto.parentId !== undefined && dto.parentId === id) {
      throw new BusinessError("上级部门不能是自己");
    }
    const updated = await deptRepository.update(id, dto);
    return {
      id: updated.id,
      parentId: updated.parentId,
      deptName: updated.deptName,
      sort: updated.sort,
      status: updated.status,
      createTime: updated.createTime.toISOString(),
    };
  },

  /** 删除部门：校验是否有子部门、是否挂了用户 */
  async remove(id: string) {
    const dept = await deptRepository.findById(id);
    if (!dept) throw new NotFoundError("部门不存在");
    const childCount = await deptRepository.countByParent(id);
    if (childCount > 0) throw new BusinessError("存在子部门，无法删除");
    const userCount = await deptRepository.countUsers(id);
    if (userCount > 0) throw new BusinessError("部门下仍有用户，无法删除");
    await deptRepository.softDelete(id);
  },

  /** 详情 */
  async detail(id: string) {
    const dept = await deptRepository.findById(id);
    if (!dept) throw new NotFoundError("部门不存在");
    return {
      id: dept.id,
      parentId: dept.parentId,
      deptName: dept.deptName,
      sort: dept.sort,
      status: dept.status,
      createTime: dept.createTime.toISOString(),
    };
  },
};
