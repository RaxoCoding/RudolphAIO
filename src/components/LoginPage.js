import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Layout,
  Menu,
  Breadcrumb,
  Typography,
  Input,
  Submit,
  Center,
  Button,
  Divider,
  Form,
} from "antd";
import { useNavigate } from "react-router-dom";
import { UserOutlined, DollarOutlined } from "@ant-design/icons";
import ConnectToPhantom from "./Phantom/ConnectToPhantom.tsx";
import sendTransferInstruction from "./Phantom/SendTransaction.tsx";
import rudolph from "./svgs/rudolph.svg";
import Wave from "react-wavify";
const { Title } = Typography;
const { SubMenu } = Menu;
const { Header, Content, Sider, Footer } = Layout;

function LoginPage(props) {
  const [userWallet, setUserWallet] = useState("none");
  const [buyKeyLoading, setBuyKeyLoading] = useState(false);
  const queryParams = new URLSearchParams(window.location.search);
  const code = queryParams.get("code");
  const navigate = useNavigate();
  const newKey = props.cookies.newKey;
  const buyKey = props.cookies.buyKey;

  const setNewKeyCookie = (value) => {
    props.setCookie("newKey", value, {
      path: "/",
    });
  };

  const setBuyKeyCookie = (value) => {
    props.setCookie("buyKey", value, {
      path: "/",
    });
  };

  // Similar to componentDidMount and componentDidUpdate:
  useEffect(() => {
    if (
      props.cookies.userToken != "none" &&
      props.cookies.userToken != undefined &&
      props.cookies.userToken != null &&
      newKey == "false"
    ) {
      axios
        .post(process.env.REACT_APP_SERVER_URI + "/api/checkAuthDiscord", {
          discordId: props.cookies.userToken,
          authToken: props.cookies.authToken,
        })
        .then((res) => {
          if (res.data.state == "success") {
            props.successMessage(res.data.message);
          } else if (res.data.state == "error") {
            props.errorMessage(res.data.message);
          }

          if (
            res.data.key != "none" &&
            res.data.expired != "false" &&
            res.data.key != undefined
          ) {
            props.setLoggedIn(true);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }, []);

  const Login = async (e) => {
    e.preventDefault();
    const discordAuth = await CallBack(code);
    if (discordAuth.data.state == "error") {
      props.errorMessage(discordAuth.data.message);
    } else {
      axios
        .post(process.env.REACT_APP_SERVER_URI + "/api/checkAuthDiscord", {
          discordId: discordAuth.data.id,
          discordLogin: true,
          authToken: discordAuth.data.authToken,
        })
        .then((res) => {
          if (res.data.state === "success") {
            props.successMessage(res.data.message);
          } else if (res.data.state === "error") {
            props.errorMessage(res.data.message);
          }

          if (
            res.data.key != "none" &&
            res.data.expired != "false" &&
            res.data.key != undefined
          ) {
            props.setCookie("authToken", discordAuth.data.authToken, {
              path: "/",
            });
            props.setCookie("userToken", res.data.discordId, {
              path: "/",
            });
            props.setLoggedIn(true);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }
  };

  const Register = async (e) => {
    e.preventDefault();
    const discordAuth = await CallBack(code);
    if (discordAuth.data.error) return;
    if (discordAuth.data.state == "error") {
        props.errorMessage(discordAuth.data.message);
      } else {
      axios
        .post(process.env.REACT_APP_SERVER_URI + "/api/linkKeyDiscord", {
          discordId: discordAuth.data.id,
          authKey: e.target.authKey.value,
        })
        .then((res) => {
          if (res.data.state === "success") {
            props.successMessage(res.data.message);
          } else if (res.data.state === "error") {
            props.errorMessage(res.data.message);
          }

          if (
            res.data.key != "none" &&
            res.data.expired != "false" &&
            res.data.key != undefined
          ) {
            props.setCookie("userToken", res.data.discordId, {
              path: "/",
            });
            setNewKeyCookie(false);
            props.setLoggedIn(true);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }
  };

  const GenerateKey = async (e) => {
    e.preventDefault();
    setBuyKeyLoading(true);
    const discordAuth = await CallBack(code);
    if (discordAuth.data.state == "error") {
        props.errorMessage(discordAuth.data.message);
      } else {
      await axios
        .post(process.env.REACT_APP_SERVER_URI + "/api/checkKeyAvailability", {
          discordId: discordAuth.data.id,
          userWallet: userWallet,
        })
        .then((res) => {
          if (res.data.state === "success") {
            sendTransferInstruction(0.99, function (transactionSignature) {
              axios
                .post(
                  process.env.REACT_APP_SERVER_URI + "/api/generateNewKey",
                  {
                    discordId: discordAuth.data.id,
                    signature: transactionSignature,
                  }
                )
                .then((res) => {
                  setBuyKeyCookie(false);
                  setBuyKeyLoading(false);
                  if (res.data.state === "success") {
                    navigate("/dashboard", { replace: true });
                    props.successMessage(res.data.message);
                    props.setCookie("userToken", discordAuth.data.id, {
                      path: "/",
                    });
                  } else if (res.data.state === "error") {
                    navigate("/dashboard", { replace: true });
                    props.errorMessage(res.data.message);
                  }
                })
                .catch((err) => {
                  console.error(err);
                  props.errorMessage(err.message);
                  setBuyKeyLoading(false);
                });
            });
          } else if (res.data.state === "error") {
            props.errorMessage(res.data.message);
            setBuyKeyLoading(false);
          }
        })
        .catch((err) => {
          console.error(err);
          props.errorMessage(err.message);
          setBuyKeyLoading(false);
        });
    }
  };

  const CallBack = async (code) => {
    const result = await axios.post(
      process.env.REACT_APP_SERVER_URI + "/api/getDiscordAuthInfo",
      { code: code }
    );

    return result;
  };

  const DiscordLogin = () => {
    window.open(process.env.REACT_APP_SERVER_URI + `/api/discordLogin`);
  };

  return (
    <div
      style={{
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
        alignContent: "center",
        flexWrap: "wrap",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <img src={rudolph} style={{ width: "200px" }} />
      <Divider style={{ width: "20%", minWidth: "20%" }} />
      {code && buyKey == "true" && userWallet == "none" ? (
        <ConnectToPhantom setUserWallet={setUserWallet} />
      ) : code && buyKey == "true" && userWallet != "none" ? (
        <>
          <Button loading={buyKeyLoading} onClick={GenerateKey}>
            Buy/Renew Key
          </Button>
          <p>Please do not refresh page during this process.</p>
        </>
      ) : code && newKey == "true" ? (
        <form action="#" onSubmit={Register}>
          <Input
            required
            type="key"
            name="authKey"
            placeholder="Auth Key"
            style={{ textAlign: "center", width: "25%" }}
          />
          <br />
          <Button htmlType="submit">Link Key To Discord</Button>
        </form>
      ) : (code && newKey == "false") || (code && buyKey == "false") ? (
        <Button onClick={Login}>Log in</Button>
      ) : (
        <>
          {/* <form action='#' onSubmit={() => {setNewKeyCookie(true); setBuyKeyCookie(false); DiscordLogin();}} style={{marginBottom: '15px'}}>
                <Button htmlType="submit">Link new Key With Discord</Button>
            </form> */}
          <form
            action="#"
            onSubmit={() => {
              setNewKeyCookie(false);
              setBuyKeyCookie(false);
              DiscordLogin();
            }}
            style={{ marginBottom: "15px" }}
          >
            <Button htmlType="submit">Login with Discord</Button>
          </form>
          <form
            action="#"
            onSubmit={() => {
              setNewKeyCookie(false);
              setBuyKeyCookie(true);
              DiscordLogin();
            }}
            style={{ marginBottom: "15px" }}
          >
            <Button htmlType="submit">Buy/Renew a Key</Button>
          </form>
        </>
      )}

      <Wave
        fill="#7a1218"
        paused={false}
        options={{
          height: 1,
          amplitude: 20,
          speed: 0.3,
          points: 2,
        }}
        style={{
          position: "fixed",
          bottom: "0",
          display: "block",
        }}
      />

      <Wave
        fill="#f5222d"
        paused={false}
        options={{
          height: 30,
          amplitude: 20,
          speed: 0.4,
          points: 3,
        }}
        style={{
          position: "fixed",
          bottom: "0",
          display: "block",
        }}
      />
    </div>
  );
}

export default LoginPage;
