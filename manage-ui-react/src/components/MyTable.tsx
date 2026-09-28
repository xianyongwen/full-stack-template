import { Table, type TableProps } from 'antd'
import { cname } from '@/utils'

/**
 * 带渐变表头的统一表格：
 * - 固定 `auto-height-table` 类名（配合 page-table-container 实现表体撑高、分页沉底）
 * - 紫色渐变表头背景
 * - 默认 rowKey="id"、size="large"、scroll.y="200px"
 * 其余 props 透传给 antd Table。
 */
export function MyTable<T extends object>({
  rowKey = 'id',
  size = 'large',
  className,
  scroll = { y: '200px' },
  ...rest
}: TableProps<T>) {
  return (
    <Table<T>
      rowKey={rowKey}
      size={size}
      className={cname('auto-height-table', 'gradient-table', className)}
      scroll={scroll}
      {...rest}
    />
  )
}
