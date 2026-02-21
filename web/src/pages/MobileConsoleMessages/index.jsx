/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Card, Empty, TabPane, Tabs, Timeline } from '@douyinfe/semi-ui';
import { Bell, Megaphone } from 'lucide-react';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { API, getRelativeTime } from '../../helpers';
import { StatusContext } from '../../context/Status';

const formatTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const MobileConsoleMessages = () => {
  const { t } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const [activeTab, setActiveTab] = useState('inApp');
  const [noticeContent, setNoticeContent] = useState('');
  const [loading, setLoading] = useState(false);

  const announcements = statusState?.status?.announcements || [];

  const timelineData = useMemo(() => {
    if (!Array.isArray(announcements)) return [];
    return announcements.slice(0, 50).map((item, idx) => ({
      key: `${item?.publishDate || idx}-${idx}`,
      time: formatTime(item?.publishDate),
      relative: getRelativeTime(item?.publishDate),
      type: item?.type || 'default',
      content: marked.parse(item?.content || ''),
      extra: item?.extra ? marked.parse(item.extra) : '',
    }));
  }, [announcements]);

  useEffect(() => {
    let mounted = true;

    const loadNotice = async () => {
      setLoading(true);
      const res = await API.get('/api/notice').catch(() => null);
      if (!mounted) return;

      if (res?.data?.success && res.data.data) {
        setNoticeContent(marked.parse(res.data.data));
      } else {
        setNoticeContent('');
      }
      setLoading(false);
    };

    loadNotice().catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className='h5-console-page mt-[60px] px-2 pb-3'>
      <Card className='!rounded-2xl'>
        <Tabs activeKey={activeTab} onChange={setActiveTab} type='line'>
          <TabPane
            itemKey='inApp'
            tab={
              <span className='h5-messages-tab'>
                <Bell size={14} />
                {t('通知')}
              </span>
            }
          >
            {loading ? (
              <Empty image={null} description={t('加载中...')} />
            ) : noticeContent ? (
              <div
                className='h5-messages-content'
                dangerouslySetInnerHTML={{ __html: noticeContent }}
              />
            ) : (
              <Empty image={null} description={t('暂无公告')} />
            )}
          </TabPane>

          <TabPane
            itemKey='system'
            tab={
              <span className='h5-messages-tab'>
                <Megaphone size={14} />
                {t('系统公告')}
              </span>
            }
          >
            {timelineData.length === 0 ? (
              <Empty image={null} description={t('暂无系统公告')} />
            ) : (
              <div className='h5-messages-timeline'>
                <Timeline mode='left'>
                  {timelineData.map((item) => (
                    <Timeline.Item
                      key={item.key}
                      type={item.type}
                      time={`${item.relative ? `${item.relative} ` : ''}${item.time}`}
                      extra={
                        item.extra ? (
                          <div
                            className='h5-messages-extra'
                            dangerouslySetInnerHTML={{ __html: item.extra }}
                          />
                        ) : null
                      }
                    >
                      <div
                        className='h5-messages-content'
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    </Timeline.Item>
                  ))}
                </Timeline>
              </div>
            )}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default MobileConsoleMessages;
