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
import { Typography } from '@douyinfe/semi-ui';
import { useHeaderBar } from '../../../hooks/common/useHeaderBar';
import { useNotifications } from '../../../hooks/common/useNotifications';
import { useNavigation } from '../../../hooks/common/useNavigation';
import { isAdmin } from '../../../helpers';
import NoticeModal from '../NoticeModal';
import MobileMenuButton from './MobileMenuButton';
import HeaderLogo from './HeaderLogo';
import Navigation from './Navigation';
import ActionButtons from './ActionButtons';

const HeaderBar = ({ onMobileMenuToggle, drawerOpen }) => {
  const {
    userState,
    statusState,
    isMobile,
    collapsed,
    logoLoaded,
    currentLang,
    location,
    isLoading,
    systemName,
    logo,
    isNewYear,
    isSelfUseMode,
    docsLink,
    isDemoSiteMode,
    isConsoleRoute,
    theme,
    headerNavModules,
    pricingRequireAuth,
    logout,
    handleLanguageChange,
    handleThemeToggle,
    handleMobileMenuToggle,
    navigate,
    t,
  } = useHeaderBar({ onMobileMenuToggle, drawerOpen });

  const {
    noticeVisible,
    unreadCount,
    handleNoticeOpen,
    handleNoticeClose,
    getUnreadKeys,
  } = useNotifications(statusState);

  const { mainNavLinks } = useNavigation(t, docsLink, headerNavModules);
  const mobileConsoleTitles = {
    '/console/home': '首页',
    '/console/log': '日志',
    '/console/models-mobile': '模型列表',
    '/console/token': '密钥',
    '/console/personal': '我的',
  };
  // H5 sub-pages that manage their own header (back button etc.)
  const mobileHeadlessRoutes = ['/console/topup'];
  const isMobileHeadless =
    isMobile && !isAdmin() && mobileHeadlessRoutes.includes(location.pathname);
  const isMobileUserPrimaryConsole =
    isMobile && !isAdmin() && Boolean(mobileConsoleTitles[location.pathname]);
  const mobileTitle = isMobileUserPrimaryConsole
    ? t(mobileConsoleTitles[location.pathname])
    : '';
  const isMobileHomeRoute =
    isMobile && !isAdmin() && location.pathname === '/console/home';
  const [isHomeTopbarScrolled, setIsHomeTopbarScrolled] = React.useState(false);

  React.useEffect(() => {
    if (!isMobileHomeRoute) {
      setIsHomeTopbarScrolled(false);
      return;
    }

    const onScroll = () => {
      setIsHomeTopbarScrolled(window.scrollY > 12);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [isMobileHomeRoute]);

  const headerClassName = isMobileHomeRoute
    ? `text-semi-color-text-0 sticky top-0 z-50 transition-all duration-300 h5-home-topbar ${
        isHomeTopbarScrolled
          ? 'h5-home-topbar--scrolled'
          : 'h5-home-topbar--merged'
      }`
    : 'text-semi-color-text-0 sticky top-0 z-50 transition-colors duration-300 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-lg';

  // H5 sub-pages with own header: hide the global headerbar, keep modals
  if (isMobileHeadless) {
    return (
      <NoticeModal
        visible={noticeVisible}
        onClose={handleNoticeClose}
        isMobile={isMobile}
        defaultTab={unreadCount > 0 ? 'system' : 'inApp'}
        unreadKeys={getUnreadKeys()}
      />
    );
  }

  return (
    <header className={headerClassName}>
      <NoticeModal
        visible={noticeVisible}
        onClose={handleNoticeClose}
        isMobile={isMobile}
        defaultTab={unreadCount > 0 ? 'system' : 'inApp'}
        unreadKeys={getUnreadKeys()}
      />

      <div className='w-full px-2'>
        {isMobileUserPrimaryConsole ? (
          <div className='flex items-center h-16 px-1'>
            <Typography.Text
              strong
              style={{ fontSize: 16 }}
              className={isMobileHomeRoute ? 'h5-home-topbar-title' : ''}
            >
              {mobileTitle}
            </Typography.Text>
          </div>
        ) : (
          <div className='flex items-center justify-between h-16'>
            <div className='flex items-center'>
              <MobileMenuButton
                isConsoleRoute={isConsoleRoute}
                isMobile={isMobile}
                drawerOpen={drawerOpen}
                collapsed={collapsed}
                onToggle={handleMobileMenuToggle}
                t={t}
              />

              <HeaderLogo
                isMobile={isMobile}
                isConsoleRoute={isConsoleRoute}
                logo={logo}
                logoLoaded={logoLoaded}
                isLoading={isLoading}
                systemName={systemName}
                isSelfUseMode={isSelfUseMode}
                isDemoSiteMode={isDemoSiteMode}
                t={t}
              />
            </div>

            <Navigation
              mainNavLinks={mainNavLinks}
              isMobile={isMobile}
              isLoading={isLoading}
              userState={userState}
              pricingRequireAuth={pricingRequireAuth}
            />

            <ActionButtons
              isNewYear={isNewYear}
              unreadCount={unreadCount}
              onNoticeOpen={handleNoticeOpen}
              theme={theme}
              onThemeToggle={handleThemeToggle}
              currentLang={currentLang}
              onLanguageChange={handleLanguageChange}
              userState={userState}
              isLoading={isLoading}
              isMobile={isMobile}
              isSelfUseMode={isSelfUseMode}
              logout={logout}
              navigate={navigate}
              t={t}
            />
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderBar;
