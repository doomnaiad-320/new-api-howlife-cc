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
import { Copy, Gift } from 'lucide-react';
import { AppCard } from '../ui';

const HomeInviteCard = ({
  t,
  rebatePercent,
  rebateMaxCount,
  inviteCode,
  inviteLink,
  affHistoryQuota,
  affCount,
  onCopyInviteCode,
  onCopyInviteLink,
}) => {
  const percentValue = Number(rebatePercent || 0);
  const maxCountValue = Number(rebateMaxCount || 0);

  return (
    <AppCard className='h5-home-app-card h5-home-app-invite-referral'>
      <div className='h5-home-app-invite-top'>
        <div className='h5-home-app-invite-topLeft'>
          <div className='h5-home-app-invite-titleRow'>
            <Gift size={16} />
            <span className='h5-home-app-invite-titleText'>
              {t('有福同享，每次充值都能赚')}
            </span>
          </div>

          <div className='h5-home-app-invite-subRow'>
            <span className='h5-home-app-invite-subMuted'>{t('最高可享')}</span>
            <span className='h5-home-app-invite-subPercent'>
              {Number.isFinite(percentValue) ? percentValue : 0}%
            </span>
            <span className='h5-home-app-invite-subMuted'>{t('返利')}</span>
            {Number.isFinite(maxCountValue) && maxCountValue > 0 ? (
              <span className='h5-home-app-invite-subTimes'>
                <span className='h5-home-app-invite-subDot' aria-hidden='true'>
                  ·
                </span>
                <span className='h5-home-app-invite-subMuted'>{t('最多')}</span>
                <span className='h5-home-app-invite-subCount'>
                  {maxCountValue}
                </span>
                <span className='h5-home-app-invite-subMuted'>{t('次')}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className='h5-home-app-invite-stats'>
          <div className='h5-home-app-invite-stat'>
            <div className='h5-home-app-invite-stat-k'>{t('收益')}</div>
            <div className='h5-home-app-invite-stat-v'>{affHistoryQuota}</div>
          </div>
          <div className='h5-home-app-invite-stat-divider' />
          <div className='h5-home-app-invite-stat'>
            <div className='h5-home-app-invite-stat-k'>{t('已邀')}</div>
            <div className='h5-home-app-invite-stat-v'>{affCount}</div>
          </div>
        </div>
      </div>

      <div className='h5-home-app-invite-field'>
        <div className='h5-home-app-invite-field-text'>
          <span className='h5-home-app-invite-label'>{t('折扣码')}</span>
          <span className='h5-home-app-invite-value is-strong'>
            {inviteCode || '-'}
          </span>
          <span className='h5-home-app-invite-tip'>
            {t('充值用折扣码：你返利，好友加享')}{' '}
            <span className='h5-home-app-invite-tip-accent'>5%</span>{' '}
            {t('折扣')}
          </span>
        </div>
        <button
          type='button'
          className='h5-home-app-copy-btn is-accent'
          onClick={onCopyInviteCode}
          aria-label={t('复制折扣码')}
        >
          <Copy size={16} />
        </button>
      </div>

      <div className='h5-home-app-invite-field'>
        <div className='h5-home-app-invite-field-text'>
          <span className='h5-home-app-invite-label'>{t('邀请链接')}</span>
          <span className='h5-home-app-invite-value'>{inviteLink || '-'}</span>
        </div>
        <button
          type='button'
          className='h5-home-app-copy-btn is-accent'
          onClick={onCopyInviteLink}
          aria-label={t('复制邀请链接')}
        >
          <Copy size={16} />
        </button>
      </div>
    </AppCard>
  );
};

export default HomeInviteCard;
