import AiTipsIcon from '@/assets/ai-tips.svg?react'
import { Tooltip, Alert, type TooltipProps } from 'antd'
import { cname } from '@/utils'

const AiTips = ({
  text,
  className,
  placement,
}: {
  text: string | React.ReactNode
  className?: string
  placement?: TooltipProps['placement']
}) => {
  return (
    <Tooltip
      title={
        <div>
          <div className='text-[#1e1b4b] py-2'>AI分析依据:</div>
          <div className="max-h-[55vh] max-w-full overflow-y-auto overflow-x-hidden break-words pr-1">
            {text}
          </div>
        </div>
      }
      color="#fff"
      placement={placement}
      classNames={{
        root: 'max-w-fit',
        container: 'min-w-[400px]! max-w-[600px]!',
      }}
    >
      <AiTipsIcon className={cname('w-6 h-6 text-[#999]', className)} />
    </Tooltip>
  )
}

/** 依据列表形式的 AiTips：仅当 basis 非空时渲染图标，悬停展示「AI分析依据」Alert 列表。 */
export const BasisTips = ({
  basis,
  placement,
}: {
  basis?: string[]
  placement?: TooltipProps['placement']
}) =>
  basis && basis.length > 0 ? (
    <AiTips
      placement={placement}
      text={
        <div className="flex flex-col gap-1">
          {basis.map((r, i) => (
            <Alert key={i} title={r} type="info" />
          ))}
        </div>
      }
    />
  ) : null

export default AiTips;

