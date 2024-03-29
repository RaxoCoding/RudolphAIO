import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Layout,
  Menu,
  Statistic,
  Breadcrumb,
  Typography,
  Input,
  Submit,
  Center,
  Button,
  Form,
  List,
  Divider,
  Modal,
  Card,
  Select,
} from "antd";
import {
  UserOutlined,
  DollarOutlined,
  PlusSquareOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";

const { Title } = Typography;
const { SubMenu } = Menu;
const { Header, Content, Sider, Footer } = Layout;
const { Option } = Select;

function Monitors(props) {
  const [monitors, setMonitors] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settings, setSettings] = useState({
      type: 'Collection',
      data: {
        siteName: 'ME',
        data: 'none',
        floorLow: 0,
        floorHigh: 0
      }
  });
  const [currentType, setCurrentType] = useState("collection");
  const [currentSite, setCurrentSite] = useState("ME");

  const fetchMoreData = () => {
    setDataLoading(true);
    axios
      .post(process.env.REACT_APP_SERVER_URI + "/api/getMonitors", {
        userToken: props.cookies.userToken,
        authToken: props.cookies.authToken,
      })
      .then((res) => {
        if (res.data.monitors) {
          let finalList = [];

          res.data.monitors.collections.forEach(async (item) => {
            await finalList.push({
              type: "collection",
              data: item,
            });
          });

          res.data.monitors.wallets.forEach(async (item) => {
            await finalList.push({
              type: "wallet",
              data: item,
            });
          });

          setMonitors(finalList);
          setDataLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  };

  useEffect(() => {
    fetchMoreData();
  }, []);

  const addMonitor = (e) => {
    e.preventDefault();
    setDataLoading(true);
    axios
      .post(process.env.REACT_APP_SERVER_URI + "/api/addMonitor", {
        userToken: props.cookies.userToken,
        type: currentType,
        data: e.target.data.value,
        siteName: currentSite,
        floorLow: e.target.floorLow.value || 0,
        floorHigh: e.target.floorHigh.value || 100,
      })
      .then((res) => {
        if (res.data.state == "success") {
          props.successMessage(res.data.message);
        } else if (res.data.state == "error") {
          props.errorMessage(res.data.message);
        }

        setModalVisible(false);
        fetchMoreData();
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const deleteMonitor = (monitor) => {
    axios
      .post(process.env.REACT_APP_SERVER_URI + "/api/deleteMonitor", {
        userToken: props.cookies.userToken,
        type: monitor.type.toLowerCase(),
        monitor: monitor.data,
      })
      .then((res) => {
        if (res.data.state == "success") {
          props.successMessage(res.data.message);
        } else if (res.data.state == "error") {
          props.errorMessage(res.data.message);
        }

        setSettingsVisible(false);
        fetchMoreData();
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const saveSettings = (e) => {
    e.preventDefault();
    setDataLoading(true);
    axios
      .post(process.env.REACT_APP_SERVER_URI + "/api/updateMonitor", {
        old: settings,
        userToken: props.cookies.userToken,
        type: currentType,
        data: e.target.data.value,
        siteName: currentSite,
        floorLow: e.target.floorLow.value || 0,
        floorHigh: e.target.floorHigh.value || 100,
      })
      .then((res) => {
        if (res.data.state == "success") {
          props.successMessage("Succesfully Edited Monitor");
        } else if (res.data.state == "error") {
          props.errorMessage(res.data.message);
        }

        setSettingsVisible(false);
        fetchMoreData();
      })
      .catch((err) => {
        console.error(err);
      });
  };

  return (
    <>
      <ul style={{ textAlign: "center" }}>
        <li style={{ display: "inline" }}>
          <Card style={{ display: "inline-block", width: "25%" }}>
            <Statistic title="Active Monitors" value={monitors.length} />
          </Card>
        </li>
        <li style={{ display: "inline" }}>
          <Card style={{ display: "inline-block", width: "25%" }}>
            <Statistic
              title="Wallets"
              value={monitors.filter((obj) => obj.type === "wallet").length}
            />
          </Card>
        </li>
        <li style={{ display: "inline" }}>
          <Card style={{ display: "inline-block", width: "25%" }}>
            <Statistic
              title="Collections"
              value={monitors.filter((obj) => obj.type === "collection").length}
            />
          </Card>
        </li>
      </ul>

      <div
        id="scrollableDiv"
        style={{
          height: 400,
          overflow: "visible",
          padding: "0 16px",
          border: "1px solid rgba(140, 140, 140, 0.35)",
          position: "relative",
        }}
      >
        <PlusSquareOutlined
          style={{
            cursor: "pointer",
            position: "absolute",
            top: "-32px",
            right: "0px",
            fontSize: "24px",
          }}
          onClick={() => {
            setModalVisible(true);
          }}
        />
        <InfiniteScroll
          dataLength={monitors.length}
          hasMore={false}
          endMessage={<Divider plain></Divider>}
          scrollableTarget="scrollableDiv"
        >
          <List
            dataSource={monitors}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                actions={[
                  <SettingOutlined
                    onClick={() => {
                      console.log(item);
                      setSettings(item);
                      setSettingsVisible(true);
                    }}
                  />,
                ]}
              >
                <List.Item.Meta
                  title={`${
                    item.type.charAt(0).toUpperCase() + item.type.slice(1)
                  } Monitor`}
                  description={
                    <>
                      <p
                        style={{ display: "inline" }}
                      >{`Monitoring... ${item.data.data}, `}</p>
                      {item.type == "collection" ? (
                        <div style={{ display: "inline" }}>
                          <p
                            style={{ display: "inline" }}
                          >{`Website: ${item.data.siteName}, `}</p>
                          <p
                            style={{ display: "inline" }}
                          >{`Floor Low: ${item.data.floorLow}, `}</p>
                          <p
                            style={{ display: "inline" }}
                          >{`Floor High: ${item.data.floorHigh}`}</p>
                        </div>
                      ) : null}
                    </>
                  }
                />
              </List.Item>
            )}
          />
        </InfiniteScroll>
      </div>

      {settingsVisible ? (
        <Modal
          title={"Edit Monitor"}
          visible={settingsVisible}
          onCancel={() => setSettingsVisible(false)}
          footer={[
            <Button
              key="back"
              onClick={() => {
                setSettingsVisible(false);
              }}
            >
              Close
            </Button>,
          ]}
        >
          <form
            action="#"
            style={{ textAlign: "center" }}
            autocomplete="off"
            onSubmit={saveSettings}
          >
            <p>Monitor Type</p>
            <Select
              onChange={(value) => {
                setCurrentType(value);
              }}
              required
              defaultValue={settings.type.toLowerCase()}
              style={{ textAlign: "center", width: "50%" }}
            >
              <Option value="collection">Collection</Option>
              <Option value="wallet">Wallet</Option>
            </Select>
            <br />
            {currentType === "wallet" ? null : (
              <>
                <p>Site To Monitor</p>
                <Select
                  onChange={(value) => {
                    setCurrentSite(value);
                  }}
                  required
                  defaultValue={settings.data.siteName}
                  style={{ textAlign: "center", width: "50%" }}
                >
                  <Option value="ME">Magic Eden</Option>
                  <Option value="SA">Solanart</Option>
                  <Option value="OS">Open Sea</Option>
                </Select>
                <br />
              </>
            )}
            <p style={{ marginTop: "30px" }}>Data to Monitor</p>
            <Input
              defaultValue={settings.data.data}
              autocomplete="off"
              required
              type="text"
              name="data"
              placeholder="solbots"
              style={{ textAlign: "center", width: "50%" }}
            />
            <br />
            <p style={{ marginTop: "30px" }}>Floor Price Low</p>
            <Input
              defaultValue={settings.data.floorLow}
              autocomplete="off"
              type="number"
              name="floorLow"
              placeholder="1"
              style={{ textAlign: "center", width: "50%" }}
            />
            <br />
            <p style={{ marginTop: "30px" }}>Floor Price High</p>
            <Input
              defaultValue={settings.data.floorHigh}
              autocomplete="off"
              type="number"
              name="floorHigh"
              placeholder="5"
              style={{ textAlign: "center", width: "50%" }}
            />
            <br />
            <Button htmlType="submit" style={{ marginTop: "30px" }}>
              Save Settings
            </Button>
          </form>
          <Button
            onClick={() => {
              deleteMonitor(settings);
            }}
            style={{ marginTop: "30px" }}
          >
            Delete Monitor
          </Button>
        </Modal>
      ) : null}

      <Modal
        title={"New Monitor"}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button
            key="back"
            onClick={() => {
              setModalVisible(false);
            }}
          >
            Close
          </Button>,
        ]}
      >
        <form
          action="#"
          style={{ textAlign: "center" }}
          autocomplete="off"
          onSubmit={addMonitor}
        >
          <p>Monitor Type</p>
          <Select
            onChange={(value) => {
              setCurrentType(value);
            }}
            required
            defaultValue="collection"
            style={{ textAlign: "center", width: "50%" }}
          >
            <Option value="collection">Collection</Option>
            <Option value="wallet">Wallet</Option>
          </Select>
          <br />
          {currentType === "wallet" ? null : (
            <>
              <p>Site To Monitor</p>
              <Select
                onChange={(value) => {
                  setCurrentSite(value);
                }}
                required
                defaultValue={"ME"}
                style={{ textAlign: "center", width: "50%" }}
              >
                <Option value="ME">Magic Eden</Option>
                <Option value="SA">Solanart</Option>
                <Option value="OS">Open Sea</Option>
              </Select>
              <br />
            </>
          )}
          <p style={{ marginTop: "30px" }}>Data to Monitor</p>
          <Input
            autocomplete="off"
            required
            type="text"
            name="data"
            placeholder="solbots"
            style={{ textAlign: "center", width: "50%" }}
          />
          <br />
          <p style={{ marginTop: "30px" }}>Floor Price Low</p>
          <Input
            autocomplete="off"
            type="number"
            name="floorLow"
            placeholder="1"
            style={{ textAlign: "center", width: "50%" }}
          />
          <br />
          <p style={{ marginTop: "30px" }}>Floor Price High</p>
          <Input
            autocomplete="off"
            type="number"
            name="floorHigh"
            placeholder="5"
            style={{ textAlign: "center", width: "50%" }}
          />
          <br />
          <Button htmlType="submit" style={{ marginTop: "30px" }}>
            Create Monitor
          </Button>
        </form>
      </Modal>
    </>
  );
}

export default Monitors;
