
const ContainerHeader = ({ title = '默认标题', children }: { title?: string; children?: React.ReactNode }) => {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-gray-200">
      <h2 className="text-[14px] font-semibold text-gray-900 m-0!">{title}</h2>
      {children}
    </div>
  )
}
export default ContainerHeader;
