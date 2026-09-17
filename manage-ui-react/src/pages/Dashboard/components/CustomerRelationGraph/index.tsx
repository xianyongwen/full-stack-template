import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Graph } from '@antv/g6'
import type {
  BehaviorOptions,
  NodeData,
  EdgeData,
  IPointerEvent,
  IElementEvent,
  ElementDatum,
  Element as G6Element,
} from '@antv/g6'
import { Button, Dropdown, Modal, Segmented, Select, message } from 'antd'
import {
  DeleteOutlined,
  EyeOutlined,
  NodeIndexOutlined,
  ShareAltOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import Container from '@/components/Container'
import ContainerHeader from '@/components/Container/ContainerHeader'
import { customerApi, graphApi, aiBuildStream } from '../../mock/api'
import type {
  GraphNodeVO,
  GraphEdgeVO,
  GraphDataVO,
  CreateGraphNodeDTO,
} from '../../mock/types'
import { dashboardBus } from '@/pages/Dashboard/bus'
import {
  EdgeEditModal,
  NodeEditModal,
  NODE_KIND_META,
  RELATION_TYPES,
  type EdgeEditModalRef,
  type GraphEdgeData,
  type GraphNodeData,
  type NodeEditModalRef,
  type NodeKind,
} from './GraphModals'
import AnalysisUpdateTime from '../AnalysisUpdateTime'

type GraphMode = 'preview' | 'node' | 'relation'

const MODE_OPTIONS: { value: GraphMode; label: string; icon: ReactNode }[] = [
  { value: 'preview', label: '预览', icon: <EyeOutlined /> },
  { value: 'node', label: '节点编辑', icon: <NodeIndexOutlined /> },
  { value: 'relation', label: '关系编辑', icon: <ShareAltOutlined /> },
]

/**
 * 将图谱导出的 dataURL 重绘到带白色背景、留有边距的离屏画布上。
 * G6 v5 的 toDataURL 不支持 padding / backgroundColor，故在此后处理。
 */
const composeExportImage = (dataUrl: string, padding = 40) =>
  new Promise<string>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width + padding * 2
      canvas.height = img.height + padding * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法获取 2D 上下文'))
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, padding, padding)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = dataUrl
  })

const CustomerRelationGraph = () => {
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  // 右键画布时的客户端坐标，供菜单项点击后换算成画布坐标定位新节点
  const contextMenuClientRef = useRef<{ x: number; y: number } | null>(null)
  // 待创建节点的画布坐标（由右键点换算），handleNodeSubmit 取用后清空
  const pendingNodePosRef = useRef<{ x: number; y: number } | null>(null)

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [customerId, setCustomerId] = useState<string | undefined>()
  // 选择器选中的客户最新快照：click-select 的 onClick 在图谱初始化时注册一次，
  // 闭包内需通过 ref 读取最新值，否则只能拿到首次渲染的空值
  const customerIdRef = useRef<string | undefined>(undefined)
  const customersRef = useRef<{ id: string; name: string }[]>([])
  useEffect(() => {
    customerIdRef.current = customerId
  }, [customerId])
  useEffect(() => {
    customersRef.current = customers
  }, [customers])

  const [nodes, setNodes] = useState<GraphNodeData[]>([])
  const [edges, setEdges] = useState<GraphEdgeData[]>([])

  // 图谱最近更新时间（来自后端 GraphDataVO.updatedAt，客户切换 / AI 重建后刷新）
  const [graphUpdatedAt, setGraphUpdatedAt] = useState<string | null>(null)

  // 当前选中节点 id（用于显示删除按钮 / Delete 键删除）
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedNodeIdRef = useRef<string | null>(null)
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId
  }, [selectedNodeId])

  // 当前选中边 id（用于显示删除关系按钮 / Delete 键删除）
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const selectedEdgeIdRef = useRef<string | null>(null)
  useEffect(() => {
    selectedEdgeIdRef.current = selectedEdgeId
  }, [selectedEdgeId])

  // 标记选中由图谱内部点击触发：click-select 的 onClick 发出 contact:selected 前置位，
  // 监听器据此跳过自身发出的事件，避免重复选中 / 重复聚焦
  const internalSelectRef = useRef(false)

  // 图谱模式：预览（只读）/ 节点编辑 / 关系编辑，控制可用交互与增删入口
  const [mode, setMode] = useState<GraphMode>('preview')
  const modeRef = useRef<GraphMode>('preview')
  // 标记是否已挂载：模式 effect 首次运行时跳过（init effect 已注册初始 behaviors）
  const didMountRef = useRef(false)
  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  // 节点 / 边编辑弹窗通过 ref 命令式控制，减少 props 传递
  const nodeModalRef = useRef<NodeEditModalRef>(null)
  const edgeModalRef = useRef<EdgeEditModalRef>(null)

  // 节点最新快照：behaviors 在图谱初始化时注册一次，闭包内需通过 ref 读取最新节点
  const nodesRef = useRef<GraphNodeData[]>([])
  // 边最新快照：Delete 键删除边时需通过 ref 校验存在性
  const edgesRef = useRef<GraphEdgeData[]>([])

  // 加载客户列表（按状态/合同金额/商机数排序，重点客户优先）
  useEffect(() => {
    customerApi
      .ranking({ page: 1, pageSize: 200 })
      .then((res) => {
        const list = (res.list ?? []).map((c) => ({ id: c.id, name: c.name }))
        setCustomers(list)
        if (list.length && !customerId) setCustomerId(list[0].id)
      })
      .catch(() => message.error('客户列表加载失败'))
  }, [])

  // AI 重建流式输出（markdown，灌入 Container.thinking）
  const [thinking, setThinking] = useState('')

  // 应用图谱数据（节点 + 边）：客户切换与 AI 重建后共用
  const applyGraphData = useCallback(async (data: GraphDataVO) => {
    const nodes = data.nodes.map(toGraphNodeData)
    setNodes(nodes)
    setEdges((data.edges ?? []).map(toGraphEdgeData))
    setGraphUpdatedAt(data.updatedAt ?? null)
    setTimeout(async () => {
      await graphRef.current?.zoomBy(50)
      await graphRef.current?.fitView({ when: 'always' })
    }, 500)
  }, [])

  // 客户切换 -> 通过接口加载该客户的图谱（节点 + 边）；后端保证返回结果含客户中心节点
  useEffect(() => {
    if (!customerId) return
    dashboardBus.emit('customer:selected', {
      id: customerId,
      name: customersRef.current.find((c) => c.id === customerId)?.name ?? '',
    })

    // 切换客户后，旧的节点 / 边选中态失效，统一清空
    setSelectedNodeId(null)
    setSelectedEdgeId(null)

    let stale = false
    setLoading(true)
    graphApi
      .getGraph(customerId)
      .then((data) => {
        if (stale) return
        applyGraphData(data)
      })
      .catch(() => {
        if (stale) return
        message.error('图谱加载失败')
        setNodes([])
        setEdges([])
        setGraphUpdatedAt(null)
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      stale = true
    }
  }, [customerId, applyGraphData])

  // 用后端返回的更新时间刷新"图谱更新时间"
  // （取与当前显示时间的最大值，避免幂等返回的旧时间把显示往回拨）
  // useCallback 稳定引用：拖拽 behavior 在挂载时注册一次，闭包需安全调用最新实现
  const touchGraphUpdatedAt = useCallback(
    (serverTime: string) =>
      setGraphUpdatedAt((prev) =>
        prev && prev > serverTime ? prev : serverTime
      ),
    []
  )

  // 按模式构建 behaviors：预览=只读浏览，节点编辑=可拖动节点，关系编辑=可拖拽建边
  // 回调均通过 ref 读取最新数据；touchGraphUpdatedAt 为稳定 useCallback，故 buildBehaviors 仍稳定
  const buildBehaviors = useCallback(
    (targetMode: GraphMode): BehaviorOptions => {
      const behaviors: BehaviorOptions = ['drag-canvas', 'zoom-canvas']
      if (targetMode === 'node') {
        behaviors.push({
          type: 'drag-element',
          // 拖拽结束后持久化节点坐标：乐观更新本地 state，避免后续 setData 把节点拽回原位
          onFinish: (ids: string[]) => {
            const g = graphRef.current
            if (!g) return
            ids.forEach((id) => {
              const [x, y] = g.getElementPosition(id) as [number, number]
              const nx = Number(x.toFixed(2))
              const ny = Number(y.toFixed(2))
              setNodes((prev) =>
                prev.map((n) => (n.id === id ? { ...n, x: nx, y: ny } : n))
              )
              graphApi
                .updateNode(id, { x: nx, y: ny })
                .then((updated) => touchGraphUpdatedAt(updated.updatedAt))
                .catch(() => {
                  message.error('节点位置保存失败')
                })
            })
          },
        })
      }
      if (targetMode !== 'relation') {
        behaviors.push({
          type: 'hover-activate',
          degree: 1, // 👈🏻 Activate relations.
        })
      }
      behaviors.push({
        type: 'click-select',
        onClick: (event: IPointerEvent) => {
          const targetType = event.targetType
          // 点击空白：清除节点 / 边选中（click-select 已清空选中态）
          if (targetType !== 'node' && targetType !== 'edge') {
            setSelectedNodeId(null)
            setSelectedEdgeId(null)
            const selected = customersRef.current.find(
              (c) => c.id === customerIdRef.current
            )
            dashboardBus.emit('customer:selected', {
              id: selected?.id ?? '',
              name: selected?.name ?? '',
            })
            return
          }
          const targetId = (event.target as G6Element).id
          // click-select 在 onClick 之前已切换好状态，这里读取实际选中态
          const isSelected =
            graphRef.current?.getElementState(targetId).includes('selected') ??
            false
          if (targetType === 'edge') {
            // 选中边时清空节点选中，避免 Delete 键语义歧义
            setSelectedEdgeId(isSelected ? targetId : null)
            setSelectedNodeId(null)
            return
          }
          setSelectedNodeId(isSelected ? targetId : null)
          setSelectedEdgeId(null)
          const node = nodesRef.current.find((n) => n.id === targetId)
          if (!node) return
          if (node.kind === 'customer') {
            dashboardBus.emit('customer:selected', {
              id: node.sourceId ?? node.id,
              name: node.name,
            })
          } else if (node.kind === 'contact') {
            internalSelectRef.current = true
            dashboardBus.emit('contact:selected', {
              id: node.sourceId ?? node.id,
              name: node.name,
            })
          }
        },
      })
      if (targetMode === 'relation') {
        behaviors.push({
          type: 'create-edge',
          trigger: 'drag',
          style: {
            stroke: '#1d4ed8',
            lineWidth: 2,
            strokeDasharray: '4 4',
            endArrow: true,
          },
          onCreate: (edge: EdgeData) => {
            if (edge.source === edge.target) return
            // behaviors 在 G6 初始化时注册一次，闭包内通过 nodesRef 读取最新节点
            const srcNode = nodesRef.current.find((n) => n.id === edge.source)
            const tgtNode = nodesRef.current.find((n) => n.id === edge.target)
            edgeModalRef.current?.openAdd(
              {
                id: `edge-${Date.now()}`,
                source: edge.source,
                target: edge.target,
                relationType: 'partner',
                influence: 3,
              },
              srcNode?.name,
              tgtNode?.name,
              srcNode?.kind,
              tgtNode?.kind
            )
            return undefined
          },
        })
      }
      return behaviors
    },
    [touchGraphUpdatedAt]
  )

  // 选中节点的扩散脉冲动画：取选中态启用的 halo 图形，用 WAAPI 循环放大并淡出，
  // 颜色沿用节点主色（联系人节点为原有紫色 #8b5cf6）。选中切换 / 清空时先作废上一次。
  // halo 由 G6 在进入 selected 态时创建；状态样式若下一帧才应用，则按帧重试取到 halo。
  const pulseAnimRef = useRef<{ cancel: () => void } | null>(null)
  const pulseTokenRef = useRef(0)
  const applyPulse = useCallback((g: Graph, selectedId: string | null) => {
    // 作废上一次脉冲：取消动画 + 让进行中的重试循环自行退出
    pulseTokenRef.current += 1
    if (pulseAnimRef.current) {
      try {
        pulseAnimRef.current.cancel()
      } catch {
        // 动画所属图形已随图谱销毁，忽略
      }
      pulseAnimRef.current = null
    }
    if (!selectedId) return
    const token = pulseTokenRef.current
    const tryStart = (attempts: number) => {
      if (token !== pulseTokenRef.current) return // 已被新的选中 / 清空取代
      // 通过内部 element 控制器按 id 取节点实例，再取其 halo 图形做扩散动画
      const nodeEl = (g as any).context?.element?.getElement?.(selectedId)
      const halo = nodeEl?.getShape?.('halo')
      if (halo && typeof halo.animate === 'function') {
        const anim = halo.animate(
          [
            { lineWidth: 2, strokeOpacity: 0.6 },
            { lineWidth: 22, strokeOpacity: 0 },
          ],
          {
            duration: 1200,
            iterations: Infinity,
            easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
          }
        )
        if (anim) {
          pulseAnimRef.current = anim as { cancel: () => void }
          return
        }
      }
      // halo 尚未就绪：选中态样式可能下一帧才应用，最多重试 ~20 帧
      if (attempts < 20) {
        requestAnimationFrame(() => tryStart(attempts + 1))
      }
    }
    tryStart(0)
  }, [])

  // 初始化 G6
  useEffect(() => {
    if (!containerRef.current) return

    const graph = new Graph({
      container: containerRef.current,
      autoFit: 'view',
      // layout: {
      //   type: 'dendrogram',
      //   radial: true,
      //   nodeSep: 40,
      //   rankSep: 140,
      // },
      padding: 20,
      data: {
        nodes: nodes.map(toG6Node),
        edges: edges.map(toG6Edge),
      },
      node: {
        type: 'rect',
        style: ((model: any) => getNodeStyle(model?.data)) as any,
        // 覆盖 click-select 默认的黑色描边：按节点类型取自身主色，中心/普通节点各有不同色
        // 注：toG6Node 把整个 GraphNodeData 塞进 G6 NodeData 的 data 字段（kind 在 data.data.kind），
        //     不同 G6 版本对 state 回调传 model 还是 datum 行为可能不同，同时兼容两种路径
        state: {
          selected: ((datum: any) => {
            const kind = (datum?.data?.kind ??
              datum?.kind ??
              'contact') as NodeKind
            const meta = NODE_KIND_META[kind] ?? NODE_KIND_META.contact
            return {
              lineWidth: 4,
              stroke: meta.color,
              shadowColor: meta.color,
              shadowBlur: 8,
              // 选中态启用 halo 光环图形，作为扩散脉冲动画的载体；颜色沿用节点主色
              // （联系人节点即原有紫色 #8b5cf6），动画由 applyPulse 以 WAAPI 驱动
              halo: true,
              haloFill: 'transparent',
              haloStroke: meta.color,
              haloLineWidth: 2,
              haloStrokeOpacity: 0.6,
              haloZIndex: -1,
              haloPointerEvents: 'none',
            }
          }) as any,
          // 选中节点时，非"选中 + 下级"子树的节点置灰
          dim: {
            fill: '#f1f5f9',
            stroke: '#e2e8f0',
            iconFill: '#cbd5e1',
            labelFill: '#cbd5e1',
          },
        },
      },
      edge: {
        type: 'line',
        style: ((model: any) => getEdgeStyle(model?.data)) as any,
        // 选中边时沿用关系类型主色加粗 + 阴影，与节点选中态视觉一致
        state: {
          selected: ((datum: any) => {
            const data = datum?.data ?? datum
            const relType = RELATION_TYPES.find(
              (r) => r.value === data?.relationType
            )
            const color = relType?.color ?? '#94a3b8'
            return {
              lineWidth: 4,
              stroke: color,
              shadowColor: color,
              shadowBlur: 10,
            }
          }) as any,
          // 选中节点时，非"选中 + 下级"子树内的边置灰
          dim: {
            stroke: '#e5e7eb',
            endArrowFill: '#e5e7eb',
            labelFill: '#cbd5e1',
          },
        },
      },
      behaviors: buildBehaviors(mode),
      plugins: [
        {
          // 悬停节点/边显示自定义 Tooltip：节点展示类型/名称/职位/标签，边展示关系类型/两端/关系强度
          type: 'tooltip',
          trigger: 'hover',
          style: {
            '.tooltip': {
              // 组件默认的初始隐藏态会被 style 覆盖替换，需显式补回，避免未悬停时残留白块
              visibility: 'hidden',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '10px 12px',
            },
          },
          getContent: async (event: IElementEvent, items: ElementDatum[]) => {
            const datum = (items?.[0] as any)?.data
            if (event.targetType === 'node') {
              return buildNodeTooltipHTML(datum)
            }
            if (event.targetType === 'edge') {
              return buildEdgeTooltipHTML(datum, nodesRef.current)
            }
            return ''
          },
        },
        {
          type: 'toolbar',
          position: 'bottom-right',
          getItems: () => [
            { id: 'zoom-in', value: 'zoom-in', title: '放大' },
            { id: 'zoom-out', value: 'zoom-out', title: '缩小' },
            { id: 'reset', value: 'reset', title: '还原视图' },
            { id: 'export', value: 'export', title: '导出图片' },
          ],
          onClick: async (value: string) => {
            const g = graphRef.current
            if (!g) return
            try {
              if (value === 'zoom-in') {
                await g.zoomBy(1.2)
              } else if (value === 'zoom-out') {
                await g.zoomBy(1 / 1.2)
              } else if (value === 'reset') {
                await g.zoomBy(50)
                await g.fitView({ when: 'always' })
              } else if (value === 'export') {
                // G6 overall 模式按内容紧致边界导出，会裁掉边缘节点的标签/阴影。
                // 临时加入不可见占位节点撑大导出边界，导出后再移除。
                const pad = 60
                const ns = nodesRef.current
                const spacerIds = ['__export_pad_tl', '__export_pad_br']
                try {
                  if (ns.length) {
                    const xs = ns.map((n) => n.x ?? 0)
                    const ys = ns.map((n) => n.y ?? 0)
                    g.addNodeData([
                      {
                        id: spacerIds[0],
                        data: {
                          __spacer: true,
                          x: Math.min(...xs) - pad,
                          y: Math.min(...ys) - pad,
                        } as any,
                      },
                      {
                        id: spacerIds[1],
                        data: {
                          __spacer: true,
                          x: Math.max(...xs) + pad,
                          y: Math.max(...ys) + pad,
                        } as any,
                      },
                    ])
                    await g.draw()
                  }
                  const dataUrl = await g.toDataURL({
                    type: 'image/png',
                    encoderOptions: 1,
                    mode: 'overall',
                  })
                  // 导出统一使用白色背景并加大边距
                  const finalDataUrl = await composeExportImage(dataUrl, 40)
                  const a = document.createElement('a')
                  a.href = finalDataUrl
                  a.download = '客户关系图谱.png'
                  a.click()
                  message.success('图谱已导出')
                } finally {
                  if (ns.length) {
                    g.removeNodeData(spacerIds)
                    await g.draw()
                  }
                }
              }
            } catch {
              message.error('操作失败，请重试')
            }
          },
        },
      ],
    })

    graphRef.current = graph

    // 双击编辑：节点编辑模式编辑节点，关系编辑模式编辑关系（预览模式无操作）
    graph.on<IPointerEvent>('node:dblclick', (event) => {
      if (modeRef.current !== 'node') return
      const id = (event.target as G6Element).id
      const node = nodesRef.current.find((n) => n.id === id)
      // 客户节点由顶部下拉控制，不在此处编辑
      if (!node || node.kind === 'customer') return
      nodeModalRef.current?.openEdit(node)
    })
    graph.on<IPointerEvent>('edge:dblclick', (event) => {
      if (modeRef.current !== 'relation') return
      const id = (event.target as G6Element).id
      const edge = edgesRef.current.find((e) => e.id === id)
      if (!edge) return
      const srcNode = nodesRef.current.find((n) => n.id === edge.source)
      const tgtNode = nodesRef.current.find((n) => n.id === edge.target)
      edgeModalRef.current?.openEdit(
        edge,
        srcNode?.name,
        tgtNode?.name,
        srcNode?.kind,
        tgtNode?.kind
      )
    })

    graph.render()

    // 容器尺寸可能晚于初始化才确定（兄弟卡片数据异步返回后才撑开、窗口缩放等），
    // G6 仅在创建时读取一次容器尺寸，故监听变化后同步画布，避免画布停留在初始小高度。
    const ro = new ResizeObserver(() => {
      graphRef.current?.resize()
    })
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      // 停止脉冲动画及其重试循环
      pulseTokenRef.current += 1
      if (pulseAnimRef.current) {
        try {
          pulseAnimRef.current.cancel()
        } catch {
          // 图谱已销毁，忽略
        }
        pulseAnimRef.current = null
      }
      graph.destroy()
      graphRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 模式切换 -> 全量替换 behaviors；同时清空选中态避免删除入口与模式错配
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    // 首次挂载时 init effect 已按初始模式注册 behaviors，跳过避免重复
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    g.setBehaviors(buildBehaviors(mode))
    const nid = selectedNodeIdRef.current
    const eid = selectedEdgeIdRef.current
    if (nid) g.setElementState(nid, [])
    if (eid) g.setElementState(eid, [])
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }, [mode, buildBehaviors])

  // 同步节点快照，供 click-select behavior 闭包读取
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  // 同步边快照，供 Delete 键闭包校验选中边存在性
  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  // 数据变化 -> 写入图
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    g.setData({
      nodes: nodes.map(toG6Node),
      edges: edges.map(toG6Edge),
    })
    g.draw().then(() => {
      // draw 可能重置元素状态：按当前选中重新应用 selected / dim 高亮
      const sid = selectedNodeIdRef.current
      if (sid) toggleState(g, sid, 'selected', true)
      applyHighlight(g, sid, nodes, edges)
      // draw 重建了元素，需重新启动脉冲动画
      applyPulse(g, sid)
    })
  }, [nodes, edges, applyPulse])

  // 选中节点 -> 高亮"该节点 + 其下级节点 + 沿有向边向上追溯到的上级节点 + 其间连线"，其余置灰
  // 仅依赖 selectedNodeId：数据变化时由上面的 data effect 在 draw 完成后补一次
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    applyHighlight(g, selectedNodeId, nodesRef.current, edgesRef.current)
    applyPulse(g, selectedNodeId)
  }, [selectedNodeId, applyPulse])

  // 监听外部（如 AI 关系分析排行榜）选中联系人：定位并选中对应图谱节点
  useEffect(() => {
    const onContactSelected = (c: { id: string; name: string }) => {
      // 图谱自身点击发出的 contact:selected 已在 onClick 中处理，跳过避免重复选中 / 重复聚焦
      if (internalSelectRef.current) {
        internalSelectRef.current = false
        return
      }
      const g = graphRef.current
      if (!g) return
      const target = nodesRef.current.find(
        (n) => n.kind === 'contact' && (n.sourceId === c.id || n.id === c.id)
      )
      if (!target) return
      // 清除上一个选中节点 / 边的 selected 态（未经过 click-select，需手动清理）
      const prevNode = selectedNodeIdRef.current
      const prevEdge = selectedEdgeIdRef.current
      if (prevNode && prevNode !== target.id)
        toggleState(g, prevNode, 'selected', false)
      if (prevEdge) toggleState(g, prevEdge, 'selected', false)
      toggleState(g, target.id, 'selected', true)
      setSelectedNodeId(target.id)
      setSelectedEdgeId(null)
      g.focusElement(target.id).catch(() => {})
    }
    dashboardBus.on('contact:selected', onContactSelected)
    return () => {
      dashboardBus.off('contact:selected', onContactSelected)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  // ── 节点操作 ──────────────────────────────
  // 右键画布选类型后调用：pos 为右键点对应的画布坐标，新节点落在此处
  const handleAddNode = (kind: NodeKind, pos?: { x: number; y: number }) => {
    if (kind === 'customer') {
      message.warning('客户节点由顶部下拉控制')
      return
    }
    if (!customerId) {
      message.warning('请先选择客户')
      return
    }
    pendingNodePosRef.current = pos ?? null
    nodeModalRef.current?.openAdd(kind)
  }

  // 删除节点：二次确认后调后端，后端沿出边递归清理下级节点与相关边
  const doDelete = async (id: string) => {
    try {
      const res = await graphApi.deleteNode(id)
      setNodes((prev) => prev.filter((n) => !res.deletedNodeIds.includes(n.id)))
      setEdges((prev) => prev.filter((e) => !res.deletedEdgeIds.includes(e.id)))
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      touchGraphUpdatedAt(res.updatedAt)
      message.success('节点已删除')
    } catch {
      // 错误提示由请求拦截器统一处理
    }
  }

  const confirmDelete = (id: string) => {
    Modal.confirm({
      title: '删除节点',
      content: '将同时删除其下级节点与相关边，确定删除？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => doDelete(id),
    })
  }

  // Delete 键删除选中节点 / 边（节点需非中心节点；忽略输入框内的按键）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return
      }
      // 预览模式禁用删除；节点编辑模式只能删节点，关系编辑模式只能删边
      const m = modeRef.current
      if (m === 'preview') return
      const nodeId = selectedNodeIdRef.current
      const edgeId = selectedEdgeIdRef.current
      if (m === 'node' && nodeId) {
        const node = nodesRef.current.find((n) => n.id === nodeId)
        if (!node || node.isCenter || node.kind === 'customer') return
        e.preventDefault()
        confirmDelete(nodeId)
      } else if (m === 'relation' && edgeId) {
        const edge = edgesRef.current.find((e2) => e2.id === edgeId)
        if (!edge) return
        e.preventDefault()
        confirmDeleteEdge(edgeId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleNodeSubmit = async (node: GraphNodeData, isNew: boolean) => {
    if (!customerId) return
    try {
      if (isNew) {
        // 优先用右键点位置；缺省时按黄金角螺旋兜底
        let pos = pendingNodePosRef.current
        pendingNodePosRef.current = null
        if (!pos) {
          const ringIndex = nodesRef.current.filter((n) => !n.isCenter).length
          const angle = ringIndex * 2.39996 // 黄金角（弧度）
          const radius = 180
          pos = {
            x: Number((radius * Math.cos(angle)).toFixed(2)),
            y: Number((radius * Math.sin(angle)).toFixed(2)),
          }
        }
        // id 由后端接口返回；引用型节点（联系人/内部人员）若已在图谱中，后端返回已有节点
        const created = await graphApi.createNode(customerId, {
          kind: node.kind as CreateGraphNodeDTO['kind'],
          name: node.name,
          position: node.position,
          company: node.company,
          avatar: node.avatar,
          tags: node.tags,
          sourceId: node.sourceId,
          x: pos.x,
          y: pos.y,
        })
        setNodes((prev) =>
          prev.some((n) => n.id === created.id)
            ? prev
            : [...prev, toGraphNodeData(created)]
        )
        touchGraphUpdatedAt(created.updatedAt)
      } else {
        const updated = await graphApi.updateNode(node.id, {
          name: node.name,
          position: node.position,
          company: node.company,
          avatar: node.avatar,
          tags: node.tags,
        })
        setNodes((prev) =>
          prev.map((n) => (n.id === node.id ? toGraphNodeData(updated) : n))
        )
        touchGraphUpdatedAt(updated.updatedAt)
      }
    } catch {
      // 错误提示由请求拦截器统一处理（业务错误 message / HTTP 错误 message）
    }
  }

  // ── 边操作 ──────────────────────────────
  const handleEdgeSubmit = async (edge: GraphEdgeData, isNew: boolean) => {
    if (!customerId) return
    try {
      if (isNew) {
        // id 由后端接口生成并返回；草稿 id（edge-${ts}）在此丢弃
        const created = await graphApi.createEdge(customerId, {
          source: edge.source,
          target: edge.target,
          relationType: edge.relationType!,
          influence: edge.influence,
        })
        setEdges((prev) =>
          prev.some((e) => e.id === created.id)
            ? prev
            : [...prev, toGraphEdgeData(created)]
        )
        touchGraphUpdatedAt(created.updatedAt)
      } else {
        const updated = await graphApi.updateEdge(edge.id, {
          relationType: edge.relationType!,
          influence: edge.influence,
        })
        setEdges((prev) =>
          prev.map((e) => (e.id === edge.id ? toGraphEdgeData(updated) : e))
        )
        touchGraphUpdatedAt(updated.updatedAt)
      }
    } catch {
      // 错误提示由请求拦截器统一处理（业务错误 message / HTTP 错误 message）
    }
  }

  // 删除关系（边）：调后端软删除，成功后同步本地状态并清空选中
  // 注：边编辑弹窗的"删除关系"按钮直接调用本方法（弹窗本身已是确认语境）；
  //     画布右上角按钮与 Delete 键走 confirmDeleteEdge 二次确认
  const doDeleteEdge = async (id: string) => {
    try {
      const res = await graphApi.deleteEdge(id)
      setEdges((prev) => prev.filter((e) => e.id !== id))
      setSelectedEdgeId(null)
      touchGraphUpdatedAt(res.updatedAt)
      message.success('关系已删除')
    } catch {
      // 错误提示由请求拦截器统一处理
    }
  }

  const confirmDeleteEdge = (id: string) => {
    Modal.confirm({
      title: '删除关系',
      content: '确定删除该关系？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => doDeleteEdge(id),
    })
  }

  // AI 构建图谱（SSE 流式）：管线步骤 / LLM 思考与结果灌入 Container.thinking，完成后刷新图谱
  // mode=rebuild 清空重建；mode=increment 增量补齐缺失节点/边（与定时任务一致，不清除既有图谱）
  const runAiBuild = (mode: 'increment' | 'rebuild') => {
    if (!customerId) return
    const isIncrement = mode === 'increment'
    let thinkingMd = ''
    let section: 'thinking' | 'result' | null = null
    setThinking(isIncrement ? '## 正在增量构建……\n' : '## 正在构建……\n')
    aiBuildStream(
      customerId,
      mode,
      (ev) => {
        if (ev.type === 'step') {
          section = null
          thinkingMd += `\n## ${ev.title}\n${ev.body}\n`
          setThinking(thinkingMd)
        } else if (ev.type === 'thinking') {
          if (section !== 'thinking') {
            thinkingMd += '\n### 思考\n'
            section = 'thinking'
          }
          thinkingMd += ev.delta
          setThinking(thinkingMd)
        } else if (ev.type === 'result') {
          if (section !== 'result') {
            thinkingMd += '\n### 结果\n'
            section = 'result'
          }
          thinkingMd += ev.delta
          setThinking(thinkingMd)
        } else if (ev.type === 'data') {
          applyGraphData(ev.data)
          setSelectedNodeId(null)
          setSelectedEdgeId(null)
          message.success(isIncrement ? 'AI 增量构建完成' : 'AI 已重新生成关系图谱')
        } else if (ev.type === 'error') {
          message.error(ev.message)
        }
      },
      () => setThinking(''),
      (msg) => {
        message.error(msg)
        setThinking('')
      }
    )
  }

  const handleAIGenerate = () => {
    if (!customerId) return
    Modal.confirm({
      title: 'AI 重新生成关系图谱',
      content:
        '将清除该客户当前全部图谱节点与关系，并从联系人重新构建（AI 推断影响力）。确定继续？',
      okText: '确定重建',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => runAiBuild('rebuild'),
    })
  }

  // AI 增量构建：非破坏性（只追加缺失节点/边），点击立即触发
  const handleAIIncrement = () => {
    if (!customerId) return
    runAiBuild('increment')
  }

  // 当前选中的节点（非中心节点时显示删除按钮）
  const selectedNode = selectedNodeId
    ? (nodes.find((n) => n.id === selectedNodeId) ?? null)
    : null
  const canDeleteSelected =
    !!selectedNode && !selectedNode.isCenter && selectedNode.kind !== 'customer'

  // 当前选中的边（显示删除关系按钮）
  const selectedEdge = selectedEdgeId
    ? (edges.find((e) => e.id === selectedEdgeId) ?? null)
    : null

  return (
    <Container
      loading={loading}
      thinking={thinking}
      className="flex flex-col flex-1 p-0! relative"
    >
      <ContainerHeader title="客户关系图谱">
        <div className="flex-1 flex justify-between w-0">
          <Select
            value={customerId}
            onChange={setCustomerId}
            placeholder="选择客户"
            className="min-w-55!"
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            suffixIcon={<ShopOutlined />}
          />
          <div className="flex items-center gap-3">
            {graphUpdatedAt && (
              <AnalysisUpdateTime at={graphUpdatedAt} />
            )}
            <button className="pretty-btn h-[32px]" onClick={handleAIGenerate}>
              AI生成
            </button>
            <button className="pretty-btn h-[32px]" onClick={handleAIIncrement}>
              AI增量构建
            </button>
          </div>
        </div>
      </ContainerHeader>

      <div className="flex-1 relative">
        {/* 模式选择器：预览 / 节点编辑 / 关系编辑 */}
        <div className="absolute top-[12px] left-2.5 z-20 bg-white/95 backdrop-blur rounded-lg shadow border border-gray-200 px-1.5 py-1">
          <Segmented
            size="small"
            value={mode}
            onChange={(v) => setMode(v as GraphMode)}
            options={MODE_OPTIONS}
          />
        </div>

        <Dropdown
          trigger={mode === 'node' ? ['contextMenu'] : []}
          menu={{
            items: (Object.keys(NODE_KIND_META) as NodeKind[])
              .filter((k) => k !== 'customer')
              .map((k) => ({
                key: k,
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: NODE_KIND_META[k].color }}
                    />
                    添加{NODE_KIND_META[k].label}
                  </span>
                ),
              })),
            onClick: ({ key }) => {
              const kind = key as NodeKind
              const g = graphRef.current
              const client = contextMenuClientRef.current
              let pos: { x: number; y: number } | undefined
              if (g && client) {
                // 右键点客户端坐标 -> 画布坐标，新节点落在光标处
                const [cx, cy] = g.getCanvasByClient([client.x, client.y])
                pos = { x: Number(cx.toFixed(2)), y: Number(cy.toFixed(2)) }
              }
              handleAddNode(kind, pos)
            },
          }}
        >
          <div
            ref={containerRef}
            className="w-full h-full"
            onContextMenu={(e) => {
              contextMenuClientRef.current = { x: e.clientX, y: e.clientY }
              // 非节点编辑模式下屏蔽浏览器默认右键菜单（Dropdown trigger 为空不会弹出自定义菜单）
              if (mode !== 'node') e.preventDefault()
            }}
          />
        </Dropdown>

        {/* 节点编辑模式下，选中节点时显示删除按钮（客户中心节点不可删） */}
        {mode === 'node' && canDeleteSelected && selectedNode && (
          <Button
            danger
            icon={<DeleteOutlined />}
            className="absolute! top-[12px] right-[10px] z-20 shadow"
            onClick={() => confirmDelete(selectedNode.id)}
          >
            删除节点
          </Button>
        )}

        {/* 关系编辑模式下，选中边时显示删除关系按钮（与删除节点按钮互斥，同一位置） */}
        {mode === 'relation' && selectedEdge && (
          <Button
            danger
            icon={<DeleteOutlined />}
            className="absolute! top-[12px] right-[10px] z-20 shadow"
            onClick={() => confirmDeleteEdge(selectedEdge.id)}
          >
            删除关系
          </Button>
        )}

        {/* 图例 */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow border border-gray-200 px-3 py-2 z-10">
          <div className="text-xs font-semibold text-gray-700 mb-1">图例</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {(Object.keys(NODE_KIND_META) as NodeKind[]).map((k) => (
              <div key={k} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: NODE_KIND_META[k].color }}
                />
                <span className="text-gray-700">{NODE_KIND_META[k].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 节点 / 边编辑 modal（通过 ref 命令式控制，逻辑聚合在 GraphModals 中） */}
        <NodeEditModal
          ref={nodeModalRef}
          customerId={customerId}
          onSubmit={handleNodeSubmit}
        />
        <EdgeEditModal
          ref={edgeModalRef}
          onSubmit={handleEdgeSubmit}
          onDelete={doDeleteEdge}
        />
      </div>
    </Container>
  )
}

// ── 自定义 Tooltip 内容 ──────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildNodeTooltipHTML(node: GraphNodeData | undefined): string {
  if (!node) return ''
  const meta = NODE_KIND_META[node.kind] ?? NODE_KIND_META.contact
  const rows: string[] = []
  if (node.position) {
    rows.push(
      `<div class="flex justify-between gap-8 py-0.5"><span class="text-[12px] text-gray-400">职位/部门</span><span class="text-[12px] text-gray-700">${escapeHtml(node.position)}</span></div>`
    )
  }
  if (node.company) {
    rows.push(
      `<div class="flex justify-between gap-8 py-0.5"><span class="text-[12px] text-gray-400">所属企业</span><span class="text-[12px] text-gray-700">${escapeHtml(node.company)}</span></div>`
    )
  }
  const tags = node.tags?.length
    ? `<div class="mt-1.5 flex flex-wrap gap-1">${node.tags
        .map(
          (t) =>
            `<span class="rounded px-1.5 py-0.5 text-[11px] leading-none" style="background:${meta.bg};color:${meta.color}">${escapeHtml(t)}</span>`
        )
        .join('')}</div>`
    : ''
  return `<div class="min-w-[170px]">
  <div class="mb-1 flex items-center gap-1.5">
    <span class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium" style="background:${meta.bg};color:${meta.color}">
      <span class="h-1.5 w-1.5 rounded-full" style="background:${meta.color}"></span>
      ${meta.label}
    </span>
    ${
      node.isCenter
        ? `<span class="rounded px-1.5 py-0.5 text-[11px] font-medium text-white" style="background:${meta.color}">中心</span>`
        : ''
    }
  </div>
  <div class="mb-1 text-sm font-semibold text-gray-800">${escapeHtml(node.name)}</div>
  ${rows.join('')}
  ${tags}
</div>`
}

function buildEdgeTooltipHTML(
  edge: GraphEdgeData | undefined,
  nodes: GraphNodeData[]
): string {
  if (!edge) return ''
  const rel = RELATION_TYPES.find((r) => r.value === edge.relationType)
  const color = rel?.color ?? '#94a3b8'
  const src = nodes.find((n) => n.id === edge.source)?.name ?? '未知节点'
  const tgt = nodes.find((n) => n.id === edge.target)?.name ?? '未知节点'
  const influence = Math.max(1, Math.min(5, edge.influence ?? 3))
  const stars = '★'.repeat(influence) + '☆'.repeat(5 - influence)
  return `<div class="min-w-[170px]">
  <div class="mb-1">
    <span class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium" style="background:${color}22;color:${color}">
      <span class="h-1.5 w-1.5 rounded-full" style="background:${color}"></span>
      ${rel?.label ?? '未知关系'}
    </span>
  </div>
  <div class="mb-1 text-sm font-semibold text-gray-800">${escapeHtml(src)} <span style="color:${color}">→</span> ${escapeHtml(tgt)}</div>
  <div class="flex items-center gap-1.5 text-[12px]">
    <span class="text-gray-400">关系强度</span>
    <span class="tracking-wide" style="color:${color}">${stars}</span>
    <span class="text-gray-400">${influence}/5</span>
  </div>
</div>`
}

// ── G6 样式映射 ──────────────────────────────
function getNodeStyle(data: NodeData) {
  // 导出占位节点：不可见但参与边界计算，撑大 overall 导出范围，避免边缘节点/标签被裁切
  if ((data as any)?.__spacer) {
    return {
      x: (data?.x as number) ?? 0,
      y: (data?.y as number) ?? 0,
      size: [2, 2] as [number, number],
      fill: 'transparent',
      stroke: 'transparent',
      labelText: '',
    }
  }
  const kind = (data?.kind ?? 'contact') as NodeKind
  const meta = NODE_KIND_META[kind] ?? NODE_KIND_META.contact
  const isCenter = !!data?.isCenter
  return {
    // 节点坐标：客户节点固定在原点，其余由 state 维护
    x: (data?.x as number) ?? 0,
    y: (data?.y as number) ?? 0,
    size: isCenter
      ? ([60, 60] as [number, number])
      : ([44, 44] as [number, number]),
    radius: isCenter ? 30 : 22,
    iconText: ((data?.name as string) ?? '').charAt(0),
    // 中心节点用实色 + 白字突出层级；其他节点用浅底 + 主色文字，与图例同色系
    fill: isCenter ? meta.color : meta.bg,
    iconFill: isCenter ? '#ffffff' : meta.color,
    iconFontWeight: 600,
    stroke: meta.color,
    lineWidth: isCenter ? 3 : 2,
    labelText: (data?.name as string) ?? '',
    labelPlacement: 'bottom',
    labelFill: '#1f2937',
    labelFontSize: isCenter ? 14 : 12,
    labelFontWeight: isCenter ? 700 : 500,
  }
}

function getEdgeStyle(data: EdgeData) {
  const relType = RELATION_TYPES.find((r) => r.value === data?.relationType)
  const color = relType?.color ?? '#94a3b8'
  const influence: number = (data?.influence as number) ?? 3
  return {
    stroke: color,
    lineWidth: 0.5 + influence * 1,
    endArrow: true,
    endArrowSize: 10,
    endArrowFill: color,
    labelText: buildEdgeLabel(data),
    labelOffsetY: -12,
    labelFill: color,
    labelFontSize: 11,
    labelFontWeight: 600,
    labelBackground: true,
    labelBackgroundFill: '#ffffff',
    labelBackgroundOpacity: 0.85,
    labelPadding: [2, 6] as [number, number],
  }
}

function buildEdgeLabel(data: EdgeData) {
  const rel = RELATION_TYPES.find((r) => r.value === data?.relationType)
  return rel?.label ?? ''
}

/**
 * 计算从 nodeId 出发沿有向边（source -> target）可达的全部下级节点（含自身）。
 * 与后端删除节点"沿出边递归清理下级"的语义保持一致。
 */
function computeDownstream(
  nodeId: string,
  edges: GraphEdgeData[]
): Set<string> {
  const visited = new Set<string>([nodeId])
  const queue: string[] = [nodeId]
  while (queue.length) {
    const cur = queue.shift()!
    for (const e of edges) {
      if (e.source === cur && !visited.has(e.target)) {
        visited.add(e.target)
        queue.push(e.target)
      }
    }
  }
  return visited
}

/**
 * 沿有向边向上追溯：从 nodeId 出发逆向（target -> source）可达的全部上级节点（含自身）。
 * 即所有能沿有向边到达 nodeId 的节点。
 */
function computeUpstream(nodeId: string, edges: GraphEdgeData[]): Set<string> {
  const visited = new Set<string>([nodeId])
  const queue: string[] = [nodeId]
  while (queue.length) {
    const cur = queue.shift()!
    for (const e of edges) {
      if (e.target === cur && !visited.has(e.source)) {
        visited.add(e.source)
        queue.push(e.source)
      }
    }
  }
  return visited
}

/**
 * 在保留元素既有状态（如 click-select 的 'selected'）的前提下增删单个状态。
 * setElementState 为整体替换，故需先读取再合并；元素尚未渲染时静默跳过。
 */
function toggleState(g: Graph, id: string, state: string, on: boolean) {
  try {
    const cur = g.getElementState(id) ?? []
    const has = cur.includes(state)
    if (on && !has) g.setElementState(id, [...cur, state])
    else if (!on && has)
      g.setElementState(
        id,
        cur.filter((s) => s !== state)
      )
  } catch {
    // 元素尚未渲染（draw 未完成）等异常，忽略；data effect 的 .then 会补一次
  }
}

/**
 * 选中节点高亮：选中节点 + 其下级节点 + 沿有向边向上追溯到的上级节点，及其间连线
 * 保持原色，其余节点 / 边置灰。选中清空（null）时移除全部 dim 状态。
 */
function applyHighlight(
  g: Graph,
  selectedId: string | null,
  nodes: GraphNodeData[],
  edges: GraphEdgeData[]
) {
  if (!selectedId) {
    nodes.forEach((n) => toggleState(g, n.id, 'dim', false))
    edges.forEach((e) => toggleState(g, e.id, 'dim', false))
    return
  }
  // 高亮集合 = 下级子树 ∪ 上级链路（两者均含选中节点自身）
  const highlight = computeDownstream(selectedId, edges)
  for (const id of computeUpstream(selectedId, edges)) highlight.add(id)
  nodes.forEach((n) => toggleState(g, n.id, 'dim', !highlight.has(n.id)))
  edges.forEach((e) => {
    // 两端均在高亮集合内的边才高亮，否则置灰
    const inSub = highlight.has(e.source) && highlight.has(e.target)
    toggleState(g, e.id, 'dim', !inSub)
  })
}

function toG6Node(n: GraphNodeData) {
  return { id: n.id, data: { ...n } as any }
}

/** 后端 GraphNodeVO（可空字段为 null）-> 组件内 GraphNodeData（可空字段为 undefined） */
function toGraphNodeData(v: GraphNodeVO): GraphNodeData {
  return {
    id: v.id,
    kind: v.kind,
    name: v.name,
    position: v.position ?? undefined,
    company: v.company ?? undefined,
    avatar: v.avatar ?? undefined,
    tags: v.tags,
    isCenter: v.isCenter,
    sourceId: v.sourceId ?? undefined,
    x: v.x,
    y: v.y,
  }
}

/** 后端 GraphEdgeVO -> 组件内 GraphEdgeData */
function toGraphEdgeData(e: GraphEdgeVO): GraphEdgeData {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    relationType: e.relationType,
    influence: e.influence,
    lastContactTime: e.lastContactTime ?? undefined,
  }
}

function toG6Edge(e: GraphEdgeData) {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    data: { ...e } as any,
  }
}

export default CustomerRelationGraph
