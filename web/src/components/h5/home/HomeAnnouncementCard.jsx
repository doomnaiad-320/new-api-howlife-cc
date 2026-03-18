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

import React from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { AppButton, AppCard } from '../ui';

const HomeAnnouncementCard = ({
  t,
  latestAnnouncements,
  noticeSummary,
  cleanMarkdownText,
  formatDate,
  onViewMore,
  hasNew = false,
  latestIsUnread = false,
}) => {
  const hasData = latestAnnouncements.length > 0 || Boolean(noticeSummary);
  const timelineItems = latestAnnouncements.map((item, index) => ({
    key: `${item?.publishDate || index}-${index}`,
    content: cleanMarkdownText(item?.content || t('系统公告')),
    publishDate: formatDate(item?.publishDate),
  }));

  if (noticeSummary && timelineItems.length === 0) {
    timelineItems.push({
      key: 'notice-summary',
      content: noticeSummary.slice(0, 150),
      publishDate: t('即时'),
    });
  }

  return (
    <AppCard className='h5-home-app-card h5-home-app-announcement'>
      <div className='h5-home-app-card-header'>
        <div className='h5-home-app-card-title'>
          <Bell size={16} />
          <span>{t('系统公告')}</span>
          <span className='h5-home-app-badge'>{timelineItems.length || 0}</span>
          {hasNew ? <span className='h5-home-app-newTag'>{t('NEW')}</span> : null}
        </div>
        <AppButton
          type='ghost'
          icon={<ChevronRight size={14} />}
          onClick={onViewMore}
          className='h5-home-app-link-btn'
        >
          {t('查看全部')}
        </AppButton>
      </div>

      {!hasData ? (
        <div className='h5-home-app-empty'>{t('暂无公告')}</div>
      ) : (
        <div className='h5-home-app-timeline'>
          {timelineItems.map((item, index) => (
            <div key={item.key} className='h5-home-app-timeline-item'>
              <div className='h5-home-app-timeline-marker-wrap' aria-hidden='true'>
                <span className='h5-home-app-timeline-marker' />
                {index !== timelineItems.length - 1 ? (
                  <span className='h5-home-app-timeline-line' />
                ) : null}
              </div>
              <div className='h5-home-app-timeline-content'>
                <div className='h5-home-app-timeline-time'>
                  <span>{item.publishDate}</span>
                  {index === 0 && latestIsUnread ? (
                    <span className='h5-home-app-timeline-new'>{t('NEW')}</span>
                  ) : null}
                </div>
                <div
                  className={`h5-home-app-timeline-text ${index === 0 ? 'is-latest' : ''}`}
                >
                  {item.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
};

export default HomeAnnouncementCard;
