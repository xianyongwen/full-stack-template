import { useEffect, useRef, useState, useCallback } from 'react'
import { Modal, Button, App } from 'antd'
import { ExpandOutlined, CopyOutlined } from '@ant-design/icons'
import * as aceBuilds from 'ace-builds'
import 'ace-builds/src-noconflict/mode-xml'
import 'ace-builds/src-noconflict/mode-markdown'
import 'ace-builds/src-noconflict/theme-tomorrow'

const ace: typeof aceBuilds = (aceBuilds as any).default ?? aceBuilds

export interface CodeEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  mode?: string
  theme?: string
  minLines?: number
  maxLines?: number
  readOnly?: boolean
  /** 是否显示行号，默认 false */
  showLineNumbers?: boolean
  /** 是否显示放大按钮，默认 true */
  showFullscreen?: boolean
}

export function CodeEditor({
  value = '',
  onChange,
  placeholder,
  mode = 'xml',
  theme = 'tomorrow',
  minLines = 3,
  maxLines = 12,
  readOnly = false,
  showLineNumbers = false,
  showFullscreen = true,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const { message } = App.useApp()
  const [fullscreen, setFullscreen] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value ?? '').then(() => {
      message.success('已复制到剪贴板')
    })
  }, [value, message])

  useEffect(() => {
    if (!containerRef.current) return

    const editor = ace.edit(containerRef.current, {
      mode: `ace/mode/${mode}`,
      theme: `ace/theme/${theme}`,
      fontSize: 13,
      minLines,
      maxLines,
      readOnly,
      showPrintMargin: false,
      showGutter: showLineNumbers,
      highlightActiveLine: true,
      tabSize: 2,
      wrap: true,
      showLineNumbers,
      placeholder,
    })

    editor.setValue(value, -1)
    editor.on('change', () => {
      onChangeRef.current?.(editor.getValue())
    })

    editorRef.current = editor

    return () => {
      editor.destroy()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 同步外部 value 变化
  useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.getValue() !== value) {
      editor.setValue(value, -1)
    }
  }, [value])

  return (
    <>
      <div
        style={{
          borderRadius: 6,
          border: '1px solid #d9d9d9',
          overflow: 'hidden',
        }}
      >
        {/* 操作栏 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '2px 8px',
            background: '#fafafa',
            borderBottom: '1px solid #d9d9d9',
            fontSize: 12,
            color: '#999',
          }}
        >
          <span>{mode.toUpperCase()}</span>
          <div className="flex items-center gap-1">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={handleCopy}
              style={{ fontSize: 12, padding: '0 4px', height: 22 }}
            />
            {showFullscreen && (
              <Button
                type="text"
                size="small"
                icon={<ExpandOutlined />}
                onClick={() => setFullscreen(true)}
                style={{ fontSize: 12, padding: '0 4px', height: 22 }}
              />
            )}
          </div>
        </div>

        {/* 编辑器 */}
        <div ref={containerRef} style={{ width: '100%' }} />
      </div>

      <Modal
        open={fullscreen}
        title="编辑代码"
        width="80%"
        style={{ top: 40 }}
        onCancel={() => setFullscreen(false)}
        footer={[
          <Button key="cancel" onClick={() => setFullscreen(false)}>
            取消
          </Button>,
          <Button key="ok" type="primary" onClick={() => setFullscreen(false)}>
            确定
          </Button>,
        ]}
        destroyOnHidden
      >
        {fullscreen && (
          <FullscreenEditor
            value={value}
            onChange={onChange}
            mode={mode}
            theme={theme}
            placeholder={placeholder}
            readOnly={readOnly}
          />
        )}
      </Modal>
    </>
  )
}

/** 全屏弹窗内的编辑器，高度撑满可用空间 */
function FullscreenEditor({
  value,
  onChange,
  mode,
  theme,
  placeholder,
  readOnly,
}: {
  value: string
  onChange?: (v: string) => void
  mode: string
  theme: string
  placeholder?: string
  readOnly?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return

    const editor = ace.edit(containerRef.current, {
      mode: `ace/mode/${mode}`,
      theme: `ace/theme/${theme}`,
      fontSize: 14,
      readOnly,
      showPrintMargin: false,
      showGutter: true,
      highlightActiveLine: true,
      tabSize: 2,
      wrap: true,
      showLineNumbers: true,
      placeholder,
    })

    editor.setValue(value, -1)
    editor.on('change', () => {
      onChangeRef.current?.(editor.getValue())
    })

    editorRef.current = editor

    return () => {
      editor.destroy()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '60vh',
        border: '1px solid #d9d9d9',
        borderRadius: 6,
      }}
    />
  )
}
