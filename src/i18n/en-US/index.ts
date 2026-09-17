// This is just an example,
// so you can safely delete all default props below

export default {
  failed: 'Action failed',
  success: 'Action was successful',
  login: {
    google: 'Продолжить с Google',
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
    /** a11y for compact tourist chip that opens the picker menu (SC-PIECE-29). */
    touristChipAria: 'Мои туристы',
    finishPlaceBadgeAria: 'Место {n}',
    /** Own private step/peek counters (SC-PRESENCE-15/16). */
    stepsCounterAria: 'Шаги',
    peeksCounterAria: 'Просмотры',
    budgetInfinity: '∞',
    /** Multiplayer end-turn beside own marker (SC-PRESENCE-17/18). */
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
    returnAffordance: 'Вернуть с финиша',
    /** All-jail reset warning — own seat only (SC-MOVE-63). */
    allJailWarningModal: 'Все туристы попали в решётки. Они отправлены на стартовые клетки.',
    allJailWarningModalOk: 'ОК',
  },
};
