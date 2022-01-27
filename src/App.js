import 'antd/dist/antd.css';
import './App.css';
import React, { useState } from 'react';
import { BrowserView, MobileView, isBrowser, isMobile } from 'react-device-detect';
import { Layout, Menu, Breadcrumb, Typography, message, Button } from 'antd';
import { useCookies } from "react-cookie";
import rudolph from './rudolph.png';
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
  LineChartOutlined
} from '@ant-design/icons';
import QuickMint from './components/QuickMint';
import NFTStealer from './components/NFTStealer';
import MEE6Levels from './components/MEE6Levels';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import Donations from './components/Donations';
import Stats from './components/Stats';
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const { Title } = Typography;
const { SubMenu } = Menu;
const { Header, Content, Sider, Footer } = Layout;

const adminList = process.env.REACT_APP_ADMIN_LIST;

function App(props) {
  const [collapsed, setCollapsed] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [cookies, setCookie] = useCookies(["userToken", "newKey"]);

  const successMessage = (text) => {
    message.success(
    {
      content: text,
      style: {
        position: 'relative',
        right: '-6%',
      },
    });
  };

  const errorMessage = (text) => {
    message.error(
    {
      content: text,
      style: {
        position: 'relative',
        right: '-6%',
      },
    });
  };

  return (
    <>
    <BrowserView>
    {loggedIn ?
    <Layout> 
        <Header className="header">
          <div className="logo" />
          <Title style={{color: 'white', marginTop: '5px', marginLeft: '-30px'}}>Rudolph BOT</Title>
        </Header>
        <Layout style={{ minHeight: '95vh' }}>
          <Sider collapsible collapsed={collapsed} onCollapse={() => { setCollapsed(!collapsed)}}>
            <div className="logo" />
            <Menu theme="dark" mode="inline">
              <Menu.Item key="1" style={{ marginTop: '0px'}} icon={<LineChartOutlined />}>
                <Link to="/dashboard/stats">
                  Stats
                </Link>
              </Menu.Item>
              <Menu.Item key="2" icon={<RobotOutlined />}>
                <Link to="/dashboard/mee6levels">
                  MEE6 Levels
                </Link>
              </Menu.Item>
              <Menu.Item key="3" icon={<DollarOutlined />}>
                <Link to="/dashboard/donate">
                  Donations :)
                </Link>
              </Menu.Item>
              {/* <Menu.Item key="3" icon={<DollarOutlined />}>
                <Link to="/dashboard/quickmint">
                  Quick Mint
                </Link>
              </Menu.Item>
              <Menu.Item key="4" icon={<DollarOutlined />}>
                <Link to="/dashboard/nftstealer">
                  NFT Stealer
                </Link>
              </Menu.Item> */}
              {adminList.includes(cookies.userToken) ? 
              <Menu.Item key="4" icon={<KeyOutlined />}>
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
                    <Route path="/dashboard/quickmint" element={<QuickMint />} />
                    <Route path="/dashboard/nftstealer" element={<NFTStealer />} />
                    <Route path="/dashboard/donate" element={<Donations />} />
                    <Route path="/dashboard/mee6levels" element={<MEE6Levels cookies={cookies} successMessage={successMessage} errorMessage={errorMessage}/>} />
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
      <Title>Available for mobile soon...</Title>
    </MobileView>
    </>
  );
}

export default App;