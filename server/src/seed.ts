import { hashPassword } from "./common/utils/password.ts";
import { prisma } from "./prisma/client.ts";
import {
  ROLE_CODES,
  PERM_TYPE,
  NIL_UUID,
} from "./common/constants/system.ts";

export async function ensureSuperAdmin(
  username: string,
  password: string,
) {
  // 1. 确保超级管理员角色存在
  let superRole = await prisma.sysRole.findFirst({
    where: { roleCode: ROLE_CODES.SUPER_ADMIN, deleted: 0 },
  });

  if (!superRole) {
    superRole = await prisma.sysRole.create({
      data: {
        roleName: "超级管理员",
        roleCode: ROLE_CODES.SUPER_ADMIN,
        sort: 0,
        status: 1,
      },
    });
    console.log(`✓ 超级管理员角色已创建（id=${superRole.id}）`);
  }

  // 2. 查找超级管理员用户
  let superUser = await prisma.sysUser.findFirst({
    where: { username, deleted: 0 },
  });

  if (!superUser) {
    // 创建用户
    const hashed = await hashPassword(password);
    superUser = await prisma.sysUser.create({
      data: {
        username,
        nickname: "超级管理员",
        password: hashed,
        status: 1,
      },
    });
    console.log(`✓ 超级管理员用户已创建（username=${username}）`);
  } else {
    // 用户已存在，确保密码正确（可选：始终覆盖密码保证与 env 一致）
    // 如果希望每次启动都覆盖密码以同步环境变量，取消注释下面代码：
    // const hashed = await hashPassword(password);
    // await prisma.sysUser.update({ where: { id: superUser.id }, data: { password: hashed } });
  }

  // 3. 确保用户绑定了 super_admin 角色
  const existing = await prisma.sysUserRole.findFirst({
    where: { userId: superUser.id, roleId: superRole.id },
  });
  if (!existing) {
    await prisma.sysUserRole.create({
      data: { userId: superUser.id, roleId: superRole.id },
    });
    console.log(`✓ 已为用户 ${username} 绑定超级管理员角色`);
  }
}

// ────────────────────────────────────────────────
// 菜单 / 权限种子数据
// ────────────────────────────────────────────────

/** 种子权限节点：使用固定 UUID，保证可重复执行（幂等） */
interface SeedPermission {
  id: string;
  parentId: string;
  permName: string;
  permCode: string | null;
  type: number;
  code: string | null;
  component: string | null;
  icon: string | null;
  apiUrl: string | null;
  apiMethod: string | null;
  sort: number;
  visible: number;
  status: number;
}

// 固定 UUID 前缀，便于阅读：00000000-0000-1000-0000-000000000XXX
const U = (tail: number) =>
  `00000000-0000-1000-0000-${tail.toString().padStart(12, "0")}`;

const SEED_PERMISSIONS: SeedPermission[] = [
  // ── 仪表盘（顶层菜单）──
  {
    id: U(1),
    parentId: NIL_UUID,
    permName: "仪表盘",
    permCode: null,
    type: PERM_TYPE.MENU,
    code: "/",
    component: "Dashboard",
    icon: "DeploymentUnitOutlined",
    apiUrl: null,
    apiMethod: null,
    sort: 1,
    visible: 1,
    status: 1,
  },

  // ── 系统管理（目录）──
  {
    id: U(10),
    parentId: NIL_UUID,
    permName: "系统管理",
    permCode: null,
    type: PERM_TYPE.DIRECTORY,
    code: "/system",
    component: null,
    icon: "SettingOutlined",
    apiUrl: null,
    apiMethod: null,
    sort: 100,
    visible: 1,
    status: 1,
  },

  // ── 用户管理（菜单）+ 按钮 ──
  {
    id: U(11),
    parentId: U(10),
    permName: "用户管理",
    permCode: null,
    type: PERM_TYPE.MENU,
    code: "/system/user",
    component: "system/UserManage",
    icon: "UserOutlined",
    apiUrl: null,
    apiMethod: null,
    sort: 1,
    visible: 1,
    status: 1,
  },
  {
    id: U(21),
    parentId: U(11),
    permName: "用户查询",
    permCode: "system:user:list",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "GET /user",
    apiMethod: "GET",
    sort: 1,
    visible: 1,
    status: 1,
  },
  {
    id: U(22),
    parentId: U(11),
    permName: "用户新增",
    permCode: "system:user:add",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "POST /user",
    apiMethod: "POST",
    sort: 2,
    visible: 1,
    status: 1,
  },
  {
    id: U(23),
    parentId: U(11),
    permName: "用户编辑",
    permCode: "system:user:edit",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "PUT /user/:id",
    apiMethod: "PUT",
    sort: 3,
    visible: 1,
    status: 1,
  },
  {
    id: U(24),
    parentId: U(11),
    permName: "用户删除",
    permCode: "system:user:delete",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "DELETE /user/:id",
    apiMethod: "DELETE",
    sort: 4,
    visible: 1,
    status: 1,
  },
  {
    id: U(25),
    parentId: U(11),
    permName: "重置密码",
    permCode: "system:user:reset",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "PUT /user/:id/password",
    apiMethod: "PUT",
    sort: 5,
    visible: 1,
    status: 1,
  },

  // ── 角色管理（菜单）+ 按钮 ──
  {
    id: U(12),
    parentId: U(10),
    permName: "角色管理",
    permCode: null,
    type: PERM_TYPE.MENU,
    code: "/system/role",
    component: "system/RoleManage",
    icon: "TeamOutlined",
    apiUrl: null,
    apiMethod: null,
    sort: 2,
    visible: 1,
    status: 1,
  },
  {
    id: U(31),
    parentId: U(12),
    permName: "角色新增",
    permCode: "system:role:add",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "POST /role",
    apiMethod: "POST",
    sort: 1,
    visible: 1,
    status: 1,
  },
  {
    id: U(32),
    parentId: U(12),
    permName: "角色编辑",
    permCode: "system:role:edit",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "PUT /role/:id",
    apiMethod: "PUT",
    sort: 2,
    visible: 1,
    status: 1,
  },
  {
    id: U(33),
    parentId: U(12),
    permName: "角色删除",
    permCode: "system:role:delete",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "DELETE /role/:id",
    apiMethod: "DELETE",
    sort: 3,
    visible: 1,
    status: 1,
  },

  // ── 菜单管理（菜单）+ 按钮 ──
  {
    id: U(13),
    parentId: U(10),
    permName: "菜单管理",
    permCode: null,
    type: PERM_TYPE.MENU,
    code: "/system/menu",
    component: "system/MenuManage",
    icon: "SafetyOutlined",
    apiUrl: null,
    apiMethod: null,
    sort: 3,
    visible: 1,
    status: 1,
  },
  {
    id: U(41),
    parentId: U(13),
    permName: "菜单新增",
    permCode: "system:menu:add",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "POST /menu",
    apiMethod: "POST",
    sort: 1,
    visible: 1,
    status: 1,
  },
  {
    id: U(42),
    parentId: U(13),
    permName: "菜单编辑",
    permCode: "system:menu:edit",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "PUT /menu/:id",
    apiMethod: "PUT",
    sort: 2,
    visible: 1,
    status: 1,
  },
  {
    id: U(43),
    parentId: U(13),
    permName: "菜单删除",
    permCode: "system:menu:delete",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "DELETE /menu/:id",
    apiMethod: "DELETE",
    sort: 3,
    visible: 1,
    status: 1,
  },

  // ── 部门管理（菜单）+ 按钮 ──
  {
    id: U(14),
    parentId: U(10),
    permName: "部门管理",
    permCode: null,
    type: PERM_TYPE.MENU,
    code: "/system/dept",
    component: "system/DeptManage",
    icon: "ClusterOutlined",
    apiUrl: null,
    apiMethod: null,
    sort: 4,
    visible: 1,
    status: 1,
  },
  {
    id: U(51),
    parentId: U(14),
    permName: "部门新增",
    permCode: "system:dept:add",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "POST /dept",
    apiMethod: "POST",
    sort: 1,
    visible: 1,
    status: 1,
  },
  {
    id: U(52),
    parentId: U(14),
    permName: "部门编辑",
    permCode: "system:dept:edit",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "PUT /dept/:id",
    apiMethod: "PUT",
    sort: 2,
    visible: 1,
    status: 1,
  },
  {
    id: U(53),
    parentId: U(14),
    permName: "部门删除",
    permCode: "system:dept:delete",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "DELETE /dept/:id",
    apiMethod: "DELETE",
    sort: 3,
    visible: 1,
    status: 1,
  },

  // ── 字典管理（菜单）+ 按钮 ──
  {
    id: U(15),
    parentId: U(10),
    permName: "字典管理",
    permCode: null,
    type: PERM_TYPE.MENU,
    code: "/system/dict",
    component: "system/DictTypeManage",
    icon: "BookOutlined",
    apiUrl: null,
    apiMethod: null,
    sort: 5,
    visible: 1,
    status: 1,
  },
  {
    id: U(61),
    parentId: U(15),
    permName: "字典新增",
    permCode: "system:dict:add",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "POST /dict",
    apiMethod: "POST",
    sort: 1,
    visible: 1,
    status: 1,
  },
  {
    id: U(62),
    parentId: U(15),
    permName: "字典编辑",
    permCode: "system:dict:edit",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "PUT /dict/:id",
    apiMethod: "PUT",
    sort: 2,
    visible: 1,
    status: 1,
  },
  {
    id: U(63),
    parentId: U(15),
    permName: "字典删除",
    permCode: "system:dict:delete",
    type: PERM_TYPE.BUTTON,
    code: null,
    component: null,
    icon: null,
    apiUrl: "DELETE /dict/:id",
    apiMethod: "DELETE",
    sort: 3,
    visible: 1,
    status: 1,
  },
];

/**
 * 确保菜单/权限种子数据存在（幂等）。
 * 使用固定 UUID 做 upsert，可安全重复执行。
 *
 * 注意：sys_permission 和 sys_dept 有自引用 FK 约束（parentId → id），
 * 根节点用 NIL_UUID 作为 parentId，但表中不存在 id=NIL_UUID 的记录。
 * 解决方案：先创建一个"虚拟根"记录（deleted=1），满足 FK 约束，
 * 同时被所有正常查询（where: { deleted: 0 }）排除，不影响 buildTree。
 */
export async function ensureSeedPermissions() {
  // 先检查表中是否已有菜单数据（排除虚拟根），避免重复覆盖用户改动
  const existingCount = await prisma.sysPermission.count({
    where: { id: { not: NIL_UUID }, deleted: 0 },
  });
  if (existingCount > 0) {
    console.log(`✓ 菜单数据已存在（${existingCount} 条），跳过种子同步`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 1. 创建虚拟根记录（permission + dept），满足自引用 FK 约束
    await tx.sysPermission.upsert({
      where: { id: NIL_UUID },
      update: {},
      create: {
        id: NIL_UUID,
        parentId: NIL_UUID,
        permName: "__ROOT__",
        type: PERM_TYPE.DIRECTORY,
        sort: -1,
        visible: 0,
        status: 0,
        deleted: 1,
      },
    });
    await tx.sysDept.upsert({
      where: { id: NIL_UUID },
      update: {},
      create: {
        id: NIL_UUID,
        parentId: NIL_UUID,
        deptName: "__ROOT__",
        sort: -1,
        status: 0,
        deleted: 1,
      },
    });

    // 2. 插入种子权限数据（父节点先于子节点，数组已按此顺序排列）
    for (const p of SEED_PERMISSIONS) {
      await tx.sysPermission.upsert({
        where: { id: p.id },
        update: {
          parentId: p.parentId,
          permName: p.permName,
          permCode: p.permCode,
          type: p.type,
          code: p.code,
          component: p.component,
          icon: p.icon,
          apiUrl: p.apiUrl,
          apiMethod: p.apiMethod,
          sort: p.sort,
          visible: p.visible,
          status: p.status,
          deleted: 0, // 恢复可能被软删的种子节点
        },
        create: { ...p },
      });
    }
  });

  console.log(`✓ 菜单种子数据已同步（共 ${SEED_PERMISSIONS.length} 条）`);
}

/** 系统字典类型种子数据 */
interface SeedDict {
  dictName: string;
  dictType: string;
  remark: string;
  items: { dictLabel: string; dictValue: string; cssClass?: string; sort: number }[];
}

const SYSTEM_DICTS: SeedDict[] = [
  {
    dictName: "用户性别",
    dictType: "sys_user_sex",
    remark: "用户性别",
    items: [
      { dictLabel: "未知", dictValue: "0", cssClass: "default", sort: 1 },
      { dictLabel: "男", dictValue: "1", cssClass: "blue", sort: 2 },
      { dictLabel: "女", dictValue: "2", cssClass: "magenta", sort: 3 },
    ],
  },
];

/** 确保系统字典种子数据存在（幂等 upsert） */
export async function seedDictData() {
  for (const dict of SYSTEM_DICTS) {
    // Upsert 字典类型
    const dictType = await prisma.sysDictType.upsert({
      where: { dictType: dict.dictType },
      update: { dictName: dict.dictName, remark: dict.remark },
      create: {
        dictName: dict.dictName,
        dictType: dict.dictType,
        remark: dict.remark,
        sort: 0,
        status: 1,
      },
    });

    // Upsert 字典数据
    for (const item of dict.items) {
      // 用 dictType + dictValue 作为唯一标识
      const existing = await prisma.sysDictData.findFirst({
        where: { dictType: dict.dictType, dictValue: item.dictValue, deleted: 0 },
      });
      if (existing) {
        await prisma.sysDictData.update({
          where: { id: existing.id },
          data: {
            dictLabel: item.dictLabel,
            cssClass: item.cssClass ?? null,
            sort: item.sort,
          },
        });
      } else {
        await prisma.sysDictData.create({
          data: {
            dictType: dict.dictType,
            dictLabel: item.dictLabel,
            dictValue: item.dictValue,
            cssClass: item.cssClass ?? null,
            sort: item.sort,
            status: 1,
          },
        });
      }
    }
  }
  console.log(`✓ 系统字典数据已同步（共 ${SYSTEM_DICTS.length} 个字典类型）`);
}
