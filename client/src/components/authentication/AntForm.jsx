import React from "react";
import { Button, Checkbox, Form, Input } from "antd";

export default function AntForm(props) {
  async function onFinish(values) {
    const formData = new URLSearchParams();
    formData.append("username", values.username);
    formData.append("password", values.password);
    if (!props.login) {
      formData.append("confirm-password", values["confirm-password"]);
      const response = await fetch("/register", {
        method: "POST",
        body: formData,
      });
      const responseJSON = await response.json();
      if (responseJSON.success) {
        window.location.assign("/");
      }
    } else {
      const response = await fetch("/auth/local", {
        method: "POST",
        body: formData,
      });
      if (response.redirected) {
        window.location.assign(response.url);
      } else {
      }
    }
  }
  function onFinishFailed(errorInfo) {
    console.log("Failed:", errorInfo);
  }

  return (
    <Form
      name="basic"
      labelCol={{
        span: 8,
      }}
      wrapperCol={{
        span: 16,
      }}
      style={{
        maxWidth: 600,
      }}
      initialValues={{
        remember: true,
      }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
    >
      <Form.Item
        label="Email"
        name="username"
        rules={[
          {
            required: true,
            message: "Please input your email!",
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[
          {
            required: true,
            message: "Please input your password!",
          },
        ]}
      >
        <Input.Password />
      </Form.Item>
      {!props.login && (
        <Form.Item
          label="Confirm Password"
          name="confirm-password"
          rules={[
            {
              required: true,
              message: "Please re-enter your password!",
            },
          ]}
        >
          <Input.Password />
        </Form.Item>
      )}

      <Form.Item
        name="remember"
        valuePropName="checked"
        wrapperCol={{
          offset: 8,
          span: 16,
        }}
      >
        <Checkbox>Remember me</Checkbox>
      </Form.Item>

      <Form.Item
        wrapperCol={{
          offset: 8,
          span: 16,
        }}
      >
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
}
