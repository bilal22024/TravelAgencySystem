export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type PaginatedResult<T> = {
  data: T[]
  meta: PaginationMeta
}

export function buildPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

export function buildPaginatedResult<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number,
): PaginatedResult<T> {
  return {
    data,
    meta: buildPaginationMeta(page, pageSize, total),
  }
}

export function getPaginationParams(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}
