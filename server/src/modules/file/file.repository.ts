import { getClient } from "../../prisma/transaction-context.ts";

export const fileRepository = {
  findById(id: string) {
    return getClient().file.findUnique({ where: { id } });
  },
  findMany(ids: string[]) {
    return getClient().file.findMany({ where: { id: { in: ids } } });
  },
  create(data: {
    id: string;
    bucket: string;
    minioKey: string;
    mimeType: string;
  }) {
    return getClient().file.create({ data });
  },
  delete(id: string) {
    return getClient().file.delete({ where: { id } });
  },
};
