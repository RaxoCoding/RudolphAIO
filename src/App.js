import './App.css';
import 'antd/dist/antd.dark.css';
import React, { useState } from 'react';
import { BrowserView, MobileView, isBrowser, isMobile } from 'react-device-detect';
import { Layout, Menu, Breadcrumb, Typography, message, Button } from 'antd';
import { useCookies } from "react-cookie";
import rudolph from './components/svgs/rudolph.svg';
import {
  Outlet,
  Link,
  Routes,
  Route
} from "react-router-dom";
import {
  UserOutlined,
  DollarOutlined,
  RobotOutlined,
  KeyOutlined,
  LineChartOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  UsbOutlined,
  BugOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import QuickMint from './components/QuickMint';
import NFTStealer from './components/NFTStealer';
import MEE6Levels from './components/MEE6Levels';
import Generators from './components/Generators';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import Donations from './components/Donations';
import MobileLogin from './components/mobile/MobileLogin';
import Bots from './components/Bots';
import Monitors from './components/Monitors';
import Upcoming from './components/Upcoming';
import Stats from './components/Stats';


const { Title } = Typography;
const { SubMenu } = Menu;
const { Header, Content, Sider, Footer } = Layout;

const adminList = process.env.REACT_APP_ADMIN_LIST;

function App(props) {
  const [collapsed, setCollapsed] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [cookies, setCookie] = useCookies(["userToken", "newKey", "buyKey", "authToken"]);
  // const [darkMode, setDarkMode] = useState(true);
  const successMessage = (text) => {
    message.success(
    {
      content: text,
    });
  };

  const errorMessage = (text) => {
    message.error(
    {
      content: text,
    });
  };

  const loadingMessage = (text) => {
    const hide = message.loading(text, 0);
    // Dismiss manually and asynchronously
    return hide;
  };

  // const updateStyleMode = () => {

  //   if(!darkMode) {
  //     let root = document.documentElement;
  //     root.classList.remove('dark-mode');
  //     root.classList.add('light-mode');
  //     setDarkMode(!darkMode);
  //   } else {
  //     let root = document.documentElement;
  //     root.classList.remove('light-mode');
  //     root.classList.add('dark-mode');
  //     setDarkMode(!darkMode);
  //   }
  // }

  return (
    <>
    <BrowserView>
    {loggedIn ?
    <Layout> 
        <Layout style={{ minHeight: '95vh' }}>
          <Sider collapsible collapsed={collapsed} onCollapse={() => { setCollapsed(!collapsed)}}>
            <div className="logo" style={{textAlign: 'center' }}>
              <img src={rudolph} style={{width: '50%'}} />
            </div>
            <Menu theme="dark" mode="inline">
              <Menu.Item key="0" style={{ marginTop: '0px'}} icon={<LineChartOutlined />}>
                <Link to="/dashboard/stats">
                  Stats
                </Link>
              </Menu.Item>
              <Menu.Item key="1" style={{ marginTop: '0px'}} icon={<CalendarOutlined />}>
                <Link to="/dashboard/upcoming">
                  Upcoming
                </Link>
              </Menu.Item>
              <Menu.Item key="2" style={{ marginTop: '0px'}} icon={<LineChartOutlined />}>
                <Link to="/dashboard/monitors">
                  Monitors
                </Link>
              </Menu.Item>
              <Menu.Item key="3" icon={<RobotOutlined />}>
                <Link to="/dashboard/bots">
                  Bots
                </Link>
              </Menu.Item>
              <Menu.Item key="4" icon={<BugOutlined />}>
                <Link to="/dashboard/whitelistfarmer">
                  Whitelist Farmer
                </Link>
              </Menu.Item>
              <Menu.Item key="5" icon={<ExperimentOutlined />}>
                <Link to="/dashboard/generators">
                  Generators
                </Link>
              </Menu.Item>
              <Menu.Item key="6" icon={<ThunderboltOutlined />}>
                <Link to="/dashboard/quickmint">
                  Quick Mint
                </Link>
              </Menu.Item>
              {/* <Menu.Item key="7" icon={<UsbOutlined />}>
                <Link to="/dashboard/nftstealer">
                  NFT Stealer
                </Link>
              </Menu.Item> */}
              <Menu.Item key="7" icon={<DollarOutlined />}>
                <Link to="/dashboard/donate">
                  Donations :)
                </Link>
              </Menu.Item>
              {adminList.includes(cookies.userToken) ? 
              <Menu.Item key="8" icon={<KeyOutlined />}>
                <Link to="/dashboard/admin">
                  Admin Dashboard
                </Link>
              </Menu.Item>
              : null}
            </Menu>
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
          <Content style={{ margin: '0 16px' }}>
              <div className="site-layout-background" style={{ padding: 24, minHeight: 360 }}>
                  <Routes>
                    <Route path="/dashboard/stats" element={<Stats />} />
                    <Route path="/dashboard/quickmint" element={<QuickMint cookies={cookies} successMessage={successMessage} errorMessage={errorMessage}/>} />
                    <Route path="/dashboard/nftstealer" element={<NFTStealer />} />
                    <Route path="/dashboard/donate" element={<Donations successMessage={successMessage} errorMessage={errorMessage} />} />
                    <Route path="/dashboard/whitelistfarmer" element={<MEE6Levels cookies={cookies} loadingMessage={loadingMessage} successMessage={successMessage} errorMessage={errorMessage}/>} />
                    <Route path="/dashboard/generators" element={<Generators successMessage={successMessage} errorMessage={errorMessage}/>} />
                    <Route path="/dashboard/bots" element={<Bots cookies={cookies} successMessage={successMessage} errorMessage={errorMessage}/>} />
                    <Route path="/dashboard/monitors" element={<Monitors cookies={cookies} successMessage={successMessage} errorMessage={errorMessage}/>} />
                    <Route path="/dashboard/upcoming" element={<Upcoming cookies={cookies} successMessage={successMessage} errorMessage={errorMessage}/>} />
                    {adminList.includes(cookies.userToken) ? 
                      <Route path="/dashboard/admin" element={<AdminDashboard cookies={cookies} successMessage={successMessage} errorMessage={errorMessage}/>} />
                    : null}
                    <Route
                      path="*"
                      element={
                        <main style={{ padding: "1rem", textAlign: 'center' }}>
                          <img src={rudolph} style={{ width: "200px"}}/>
                          <Title>404 Rudolph is Lost!</Title>
                        </main>
                      }
                    />
                </Routes>
              </div>
            </Content>
            <Footer style={{ textAlign: 'center' }}><a style={{ color: '#f5222d' }}href="https://twitter.com/RaxoCoding" target="_blank">@RaxoCoding</a></Footer>
          </Layout>
        </Layout>
      </Layout> 
    : 
    <Routes>
      <Route
        path="/dashboard/*"
        element={
          <LoginPage setLoggedIn={setLoggedIn} cookies={cookies} setCookie={setCookie} successMessage={successMessage} errorMessage={errorMessage}/>
        }
      />
    </Routes>
    }
    </BrowserView>
    <MobileView style={{ textAlign: 'center' }}>
    {loggedIn ?
    <MEE6Levels cookies={cookies} successMessage={successMessage} errorMessage={errorMessage}/>
    :
    <Routes>
      <Route
        path="/dashboard/*"
        element={
          <LoginPage setLoggedIn={setLoggedIn} cookies={cookies} setCookie={setCookie} successMessage={successMessage} errorMessage={errorMessage}/>
        }
      />
    </Routes>
    }
    </MobileView>
    </>
  );
}

export default App;
