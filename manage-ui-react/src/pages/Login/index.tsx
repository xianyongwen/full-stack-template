import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { Button, Form, Input, Typography, App } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { loginApi } from '@/api/auth'
import { getUserInfoApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import Styles from './index.module.scss'

const { Text } = Typography

type LoginForm = { username: string; password: string }

export default function Login() {
  const [form] = Form.useForm<LoginForm>()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()

  const setToken = useAuthStore(s => s.setToken)
  const setUserInfo = useAuthStore(s => s.setUserInfo)

  // 登录成功后跳回原页面，默认 /
  const from = (location.state as { from?: string })?.from ?? '/'

  const onFinish = async (values: LoginForm) => {
    setLoading(true)
    try {
      const result = await loginApi(values)
      setToken(result.token)
      const info = await getUserInfoApi()
      setUserInfo(info)
      message.success('登录成功')
      navigate(from, { replace: true })
    } catch {
      // 错误提示已在 request 拦截器统一处理
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={Styles.loginPage}>
      <div
        className="w-[400px] rounded-2xl bg-white px-10 py-12 z-1"
        style={{ boxShadow: '0 10px 30px rgba(109, 40, 217, 0.18)' }}
      >
        {/* Logo + 标题 */}
        <div className="mb-8 flex flex-col items-center justify-center gap-1">
          <div className="flex shrink-0 h-20 gap-4 justify-center items-center px-1 overflow-hidden">
            <div className="w-[32px] h-[32px] rounded-[10px] bg-[#7C3AED] flex items-center justify-center text-white font-bold">
            M
          </div>
          <span className='text-[24px] font-bold'>
            后台管理
          </span>
          </div>
        </div>

        <Form<LoginForm>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item className="mb-0!">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-6 text-center">
          <Text className="text-xs text-gray-400">
            © {new Date().getFullYear()} xyw All rights reserved.
          </Text>
        </div>
      </div>
    </div>
  )
}
