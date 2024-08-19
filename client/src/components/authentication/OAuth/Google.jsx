import React from "react";
import { GoogleOutlined } from "@ant-design/icons";
import { Button } from "antd";
export default function Google(props) {
  return (
    <Button
      icon={<GoogleOutlined />}
      iconPosition="end"
      onClick={async () => {
        if (props.login) {
          window.location.assign("/auth/google");
        } else {
          window.location.assign("/register/google");
        }
      }}
    >
      Continue with Google
    </Button>
  );
}
