import { getClient } from "@/prisma/transaction-context";
import type { CreateDeptDTO, UpdateDeptDTO } from "./dept.schema.ts";

export const deptRepository = {
  findMany() {
    return getClient().sysDept.findMany({
      where: { deleted: 0 },
      orderBy: [{ sort: "asc" }, { createTime: "asc" }],
    });
  },

  findById(id: string) {
    return getClient().sysDept.findFirst({ where: { id, deleted: 0 } });
  },

  countByParent(parentId: string) {
    return getClient().sysDept.count({ where: { parentId, deleted: 0 } });
  },

  /** 该部门下是否还有用户 */
  countUsers(deptId: string) {
    return getClient().sysUser.count({ where: { deptId, deleted: 0 } });
  },

  create(data: CreateDeptDTO) {
    return getClient().sysDept.create({ data });
  },

  update(id: string, data: UpdateDeptDTO) {
    return getClient().sysDept.update({ where: { id }, data });
  },

  /** 逻辑删除 */
  softDelete(id: string) {
    return getClient().sysDept.update({
      where: { id },
      data: { deleted: 1 },
    });
  },
};
