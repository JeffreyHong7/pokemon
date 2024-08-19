import { useState } from "react";
import AntForm from "./AntForm";
import Google from "./OAuth/Google";

export default function Authenticate() {
  const [login, setLogin] = useState(true);
  return (
    <section id="login">
      <h1>Welcome Back</h1>
      <AntForm login={login} />
      <p>
        {login ? "Don't have an account? " : "Already have an account? "}
        <a
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setLogin((previous) => !previous);
          }}
        >
          {login ? "Sign Up!" : "Log in!"}
        </a>
      </p>
      <div id="seperator">
        <hr />
        <p>Or</p>
        <hr />
      </div>
      <div id="oauth">
        <Google login={login} />
      </div>
    </section>
  );
}
