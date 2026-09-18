// This is just an example,
// so you can safely delete all default props below

export default {
  failed: 'Action failed',
  success: 'Action was successful',
  login: {
    google: 'Продолжить с Google',
  },
  auth: {
    email: 'Email',
    emailRequired: 'Введите email',
    forgotLink: 'Забыли пароль?',
    forgotTitle: 'Восстановление пароля',
    forgotSubtitle: 'Укажите email — мы отправим ссылку для сброса пароля',
    forgotSubmit: 'Отправить ссылку',
    forgotSuccess:
      'Если аккаунт существует, письмо со ссылкой отправлено. Проверьте почту и папку «Спам».',
    backToLogin: 'Вернуться ко входу',
    cabinetTitle: 'Личный кабинет',
    backToLobby: 'В лобби',
    emailVerified: 'Подтверждён',
    emailUnverified: 'Не подтверждён',
    sendConfirm: 'Подтвердить',
    confirmSentDialog: 'Письмо отправлено. Проверьте почту и папку «Спам».',
    confirmSentOk: 'ОК',
    changeEmailTitle: 'Сменить email',
    newEmail: 'Новый email',
    changeEmailSubmit: 'Сохранить',
    verifyReminderTitle: 'Подтвердите email',
    verifyReminderText:
      'Подтвердить адрес можно в личном кабинете — откройте его и нажмите кнопку рядом с почтой.',
    verifyReminderGoCabinet: 'В личный кабинет',
    verifyReminderDismiss: 'Позже',
    accountNav: 'Кабинет',
    accountNavAria: 'Личный кабинет',
  },
  lobby: {
    create: 'Создать игру',
    createTitle: 'Создать игру',
    createConfirm: 'Создать',
    createCancel: 'Отмена',
    maxSeats: 'Число мест',
    maxSeatsOption: '{n}',
    grilleDensity: 'Плотность решёток',
    grilleDensityFew: 'мало',
    grilleDensityMedium: 'средне',
    grilleDensityMany: 'много',
    capacity: '{seats}/{maxSeats}',
  },
  game: {
    say: {
      affordance: 'Сказать',
      hello: 'Всем привет',
      luck: 'Удачи',
      ready: 'Готов начать!',
    },
    readyButton: 'Готов начать',
    countdownSoon: 'Игра скоро начнётся',
    leave: 'Выход из игры',
    leaveConfirm: 'Вы уверены? Если выйдете, прогресс будет сброшен.',
    leaveCancel: 'Отмена',
    leaveExit: 'Выйти',
    /** Place modal after all four pieces finish (SC-FINISH-03/04). */
    finishPlaceModal: 'Вы {n}-й!',
    finishPlaceModalOk: 'ОК',
    /** Solo budget expiry — five-minute timer (SC-MOVE-45 / SC-PRESENCE-21). */
    timeExpiredModal: 'Вы не успели довести туристов до финиша вовремя.',
    timeExpiredModalOk: 'ОК',
    /** Solo steps exhaustion with no live task tile (SC-MOVE-48 / SC-PRESENCE-21). */
    stepsExhaustedModal:
      'Шаги закончились, и под туристами нет плиток для просмотра. Игра для вас окончена.',
    stepsExhaustedModalOk: 'ОК',
    /** a11y for strip finish icon and presence place badge. */
    finishStripAria: 'Финиш',
    finishPlaceBadgeAria: 'Место {n}',
    /** Own private step/peek counters (SC-PRESENCE-15/16). */
    stepsCounterAria: 'Шаги',
    peeksCounterAria: 'Просмотры',
    budgetInfinity: '∞',
    /** Multiplayer end-turn dock above HUD (SC-PRESENCE-17/18/25). */
    endTurn: 'Завершить ход',
    /** Peek modal — reward amount + Correct/Wrong (SC-BOARD-08/09). */
    peekModal: 'Под плиткой награда: {n}. Ответьте правильно, чтобы получить шаги.',
    peekCorrect: 'Правильно',
    peekWrong: 'Неправильно',
    peekAffordance: 'Посмотреть под плиткой',
    /** Solo peeks∞ / finite steps modal (SC-PRESENCE-19). */
    soloUnlimitedModal: 'Вы один в игре. Просмотры безлимитны, шаги по-прежнему ограничены.',
    soloUnlimitedModalOk: 'ОК',
    /** Rescue adjacent trapped tourist (SC-MOVE-54 UX). */
    rescueAffordance: 'Освободить туриста',
    /** Return finished tourist onto center ring (SC-FINISH-13). */
    returnAffordance: 'Вернуть на поле',
    /** Confirm return-from-finish before ring highlights (SC-FINISH-13 / D5). */
    returnConfirmModal: 'Вернуть на поле?',
    returnConfirmYes: 'Да',
    returnConfirmCancel: 'Нет',
    /** All-jail reset warning — own seat only (SC-MOVE-63). */
    allJailWarningModal: 'Все туристы попали в решётки. Они отправлены на стартовые клетки.',
    allJailWarningModalOk: 'ОК',
  },
};
