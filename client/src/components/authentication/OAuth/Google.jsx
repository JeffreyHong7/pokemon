import React from "react";
import { GoogleOutlined } from "@ant-design/icons";
import { Button } from "antd";
export default function Google() {
  return (
    <Button
      icon={<GoogleOutlined />}
      iconPosition="end"
      onClick={async () => {
        window.location.assign("/auth/google");
      }}
    >
      Continue with Google
    </Button>
  );
}
