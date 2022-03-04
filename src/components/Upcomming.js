import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout, Menu, Breadcrumb, Typography, Calendar, Input, Submit, Badge, Center, Button, Form, List, Divider, Modal } from 'antd';
import {
    UserOutlined,
    DollarOutlined,
    PlusSquareOutlined,
    SettingOutlined
} from '@ant-design/icons';
import InfiniteScroll from 'react-infinite-scroll-component';

const { Title } = Typography;
const { SubMenu } = Menu;
const { Header, Content, Sider, Footer } = Layout;

function Monitors(props) {
    const [calendarData, setCalendarData] = useState([]);

    const fetchUpcommingLaunches = () => {
        axios.get('https://api-mainnet.magiceden.dev/v2/launchpad/collections?offset=0&limit=200').then(response => {
            setCalendarData(response.data);
        });
    }


    useEffect(() => {
        fetchUpcommingLaunches();
      }, []);

    function getListData(value) {
        let listData;

        // calendarData.forEach(event => {
        //     if (event.launchDatetime)
        // });

        var result = calendarData.find(obj => {
            if(obj.launchDatetime != undefined) {
                return value.isSame(obj.launchDatetime, 'day');
            }
        });

        // listData = [
        //     { type: 'warning', content:<><p>This is warning event.</p><Button onClick={() => {alert('Warning');}}>Hello!</Button></> },
        //     { type: 'success', content: 'This is usual event.' },
        //   ];

        if(result != undefined) {
            listData = [
              { type: 'success', content: <p><a href={`https://magiceden.io/launchpad/${result.symbol}`} target="_blank">{result.name}</a> <br/>@ {new Date(result.launchDatetime).getHours()}:{new Date(result.launchDatetime).getMinutes()} UTC, <br/>{result.price} SOL, <br/>{result.size} Available</p> }
            ];
        }

        return listData || [];
    }

    function dateCellRender(value) {
        const listData = getListData(value);
        return (
          <ul className="events">
            {listData.map(item => (
              <div key={item.content}>
                {item.content}
              </div>
            ))}
          </ul>
        );
      }


    return (
        <>
            <div>
                <Calendar dateCellRender={dateCellRender}/>
            </div>
        </>
    );
}

export default Monitors;