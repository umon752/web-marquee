/**
 * Web Marquee Component Events Detail Type
 */
type TWebMarqueeEventDetail = {
  element: WebMarquee;
};

/**
 * 方向類型
 */
type TDirection = 'left' | 'right';

/**
 * 子元素位置類型
 */
type TChildPosition = {
  position: number;
  maxLeftPosition: number;
  maxRightPosition: number;
  activePosition: number;
  isRightOut: boolean;
};

// 為 Custom Elements 擴充全域型別定義
declare global {
  interface HTMLElementTagNameMap {
    'web-marquee': WebMarquee;
  }

  interface HTMLElementEventMap {
    'web-marquee:start': CustomEvent<TWebMarqueeEventDetail>;
    'web-marquee:stop': CustomEvent<TWebMarqueeEventDetail>;
    'web-marquee:refresh': CustomEvent<TWebMarqueeEventDetail>;
    'web-marquee:prev': CustomEvent<TWebMarqueeEventDetail>;
    'web-marquee:next': CustomEvent<TWebMarqueeEventDetail>;
  }
}

/**
 * Web Marquee Component 類別
 * 繼承自 HTMLElement，提供標準的 Custom Element 介面
 */
class WebMarquee extends HTMLElement {
  public speed: number = 1;
  public pauseOnHover: boolean = false;
  public enableDrag: boolean = false;
  public activeClass: string = '';
  public reverseDirection: boolean = false;

  private childs: HTMLCollection | null = null;
  private cloneChilds: HTMLCollection | null = null;
  private gap: number = 0;
  private marqueeAnimationFrameId: number | null = null;
  private childPercentW: number = 100;
  private childTotalW: number = 0;
  private cloneChildTotalW: number = 0;
  private childHtml: string = '';
  private childsArray: Array<TChildPosition> = [];
  private direction: TDirection = 'left';
  private lastFrameTime: number = 0;
  private frameInterval: number = 1000 / 60;
  private isMouseDown: boolean = false;
  private startDragX: number | null = null;
  private isClick: boolean = false;
  private isReverseDirection: boolean = false;
  private activeIndex: number = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  /**
   * 定義觀察的屬性
   */
  static get observedAttributes(): string[] {
    return [
      'marquee-speed',
      'marquee-pause-on-hover',
      'marquee-enable-drag',
      'marquee-active-class',
      'marquee-reverse-direction'
    ];
  }

  /**
   * 元件連接到 DOM 時的回調
   */
  connectedCallback(): void {
    this._createShadowDom();
    this._initAttributes();
    this._init();
  }

  /**
   * 元件從 DOM 移除時的回調
   */
  disconnectedCallback(): void {
    this.stop();
  }

  /**
   * 屬性變更時的回調
   */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    switch (name) {
      case 'marquee-speed':
        this.speed = parseFloat(newValue ?? '1') || 1;
        break;
      case 'marquee-pause-on-hover':
        this.pauseOnHover = newValue !== null && newValue !== 'false';
        break;
      case 'marquee-enable-drag':
        this.enableDrag = newValue !== null && newValue !== 'false';
        break;
      case 'marquee-active-class':
        this.activeClass = newValue ?? '';
        break;
      case 'marquee-reverse-direction':
        this.reverseDirection = newValue !== null && newValue !== 'false';
        this._setDirection();
        break;
    }
  }

  /**
   * 建立 shadow dom
   */
  private _createShadowDom(): void {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
      :host {
        display: flex;
        align-items: center;
      }
    `);

    this.shadowRoot!.adoptedStyleSheets = [sheet];

    const slot = document.createElement('slot');
    this.shadowRoot!.appendChild(slot);
  }

  /**
   * 初始化屬性
   */
  private _initAttributes(): void {
    this.speed = parseFloat(this.getAttribute('marquee-speed') ?? '1') || 1;
    this.pauseOnHover = this.hasAttribute('marquee-pause-on-hover') && this.getAttribute('marquee-pause-on-hover') !== 'false';
    this.enableDrag = this.hasAttribute('marquee-enable-drag') && this.getAttribute('marquee-enable-drag') !== 'false';
    this.activeClass = this.getAttribute('marquee-active-class') ?? '';
    this.reverseDirection = this.hasAttribute('marquee-reverse-direction') && this.getAttribute('marquee-reverse-direction') !== 'false';
  }

  /**
   * 初始化元件
   */
  private _init(): void {
    this.childs = this.children;
    this._setDirection();
    this._addCloneChilds();
    this.start();
    this._addEvents();
  }

  /**
   * 設定移動方向
   */
  private _setDirection(): void {
    if (this.reverseDirection) {
      this.direction = 'right';
      this.isReverseDirection = true;
    } else {
      this.direction = 'left';
      this.isReverseDirection = false;
    }
  }

  /**
   * 添加複製的子元素
   */
  private _addCloneChilds(): void {
    if (!this.childs) return;

    const gapStyle = parseInt(window.getComputedStyle(this).getPropertyValue('gap'));
    this.gap = gapStyle ? gapStyle : 0;
    const childsLength = this.childs.length;

    Array.from(this.childs).forEach((child) => {
      this.childTotalW += (child as HTMLElement).offsetWidth;
    });
    this.childTotalW += this.gap * childsLength;

    const winW = window.innerWidth;
    const cloneTimes = Math.ceil(winW / this.childTotalW);
    this.childHtml = this.innerHTML;
    const afterContent = this.childHtml.repeat(cloneTimes);
    this.insertAdjacentHTML('beforeend', afterContent);
    this.cloneChilds = this.children;

    Array.from(this.cloneChilds).forEach((child, i) => {
      if (this.activeClass !== '') {
        if (i === 0) child.classList.add(this.activeClass);
      }
      this.cloneChildTotalW += (child as HTMLElement).offsetWidth;
    });
    this.cloneChildTotalW += this.gap * childsLength;

    this.childsArray = Array.from(this.cloneChilds).map(() => ({
      position: 0,
      maxLeftPosition: 0,
      maxRightPosition: 0,
      activePosition: 0,
      isRightOut: false,
    }));
  }

  /**
   * 清除複製的子元素
   */
  private _clearCloneChilds(): void {
    this.innerHTML = this.childHtml;
  }

  /**
   * 添加事件監聽
   */
  private _addEvents(): void {
    if (this.pauseOnHover) {
      this.addEventListener('mouseenter', () => {
        const isTouchDevice = 'ontouchstart' in document.documentElement;
        if (isTouchDevice) return;
        this.stop();
      });
    }

    if (this.enableDrag) {
      this.addEventListener('mousedown', (e) => this._startDrag(e));
      this.addEventListener('mousemove', (e) => this._moveDrag(e));
      this.addEventListener('mouseup', () => this._stopDrag());
    }

    if (this.pauseOnHover || this.enableDrag) {
      this.addEventListener('mouseleave', () => this.start());
    }
  }

  /**
   * 開始拖曳
   */
  private _startDrag(e: MouseEvent): void {
    this.isMouseDown = true;
    this.startDragX = e.pageX;
    this.stop();
  }

  /**
   * 移動拖曳
   */
  private _moveDrag(e: MouseEvent): void {
    e.preventDefault();
    if (!this.isMouseDown || this.isClick || this.startDragX === null) return;

    const moveValue = (e.pageX - this.startDragX) / 100;

    if (this.startDragX < e.pageX) this.direction = 'right';
    if (this.startDragX > e.pageX) this.direction = 'left';

    this._handlePosition(moveValue);
  }

  /**
   * 停止拖曳
   */
  private _stopDrag(): void {
    this.isMouseDown = false;
    this.stop();
  }

  /**
   * 處理位置
   */
  private _handlePosition(moveValue: number): void {
    if (!this.cloneChilds) return;

    Array.from(this.cloneChilds).forEach((child, i) => {
      const htmlChild = child as HTMLElement;
      
      if (this.direction === 'left') {
        this.childsArray[i].maxLeftPosition = (this.childPercentW * (i + 1)) * -1;
        if (this.isClick) {
          this.childsArray[i].position += -moveValue;
        } else {
          this.childsArray[i].position += (this.isMouseDown || this.isReverseDirection ? moveValue : -moveValue);
        }

        if (this.childsArray[i].position <= this.childsArray[i].maxLeftPosition) {
          this.childsArray[i].position += (this.cloneChilds!.length * this.childPercentW);
          this._changeActive(i);
        }
      }

      if (this.direction === 'right') {
        this.childsArray[i].maxRightPosition = (this.cloneChilds!.length - (i + 1)) * this.childPercentW;
        if (this.isClick) {
          this.childsArray[i].position += moveValue;
        } else {
          this.childsArray[i].position += (this.isMouseDown || this.isReverseDirection ? moveValue : -moveValue);
        }

        if (this.childsArray[i].position >= this.childsArray[i].maxRightPosition) {
          this.childsArray[i].position -= (this.cloneChilds!.length * this.childPercentW);
          this._changeActive(i);
        }
      }

      Object.assign(htmlChild.style, {
        transform: `translate3d(${this.childsArray[i].position}%, 0, 0)`
      });
    });
  }

  /**
   * 改變 active 狀態
   */
  private _changeActive(index: number): void {
    if (this.activeClass === '' || !this.cloneChilds) return;

    Array.from(this.cloneChilds).forEach((child) => {
      child.classList.remove(this.activeClass);
    });

    if (index === (this.cloneChilds.length - 1)) index = -1;
    this.cloneChilds[index + 1].classList.add(this.activeClass);
    this.activeIndex = index + 1;
  }

  /**
   * 處理過渡動畫
   */
  private _handleTransition(): void {
    const speed = this.speed * 2;
    let transitionId: number | null = null;
    let moveValue = 0;

    if (this.direction === 'left') {
      if (this.isReverseDirection) {
        const diffDistance = Math.abs(this.childsArray[this.activeIndex].maxLeftPosition - this.childsArray[this.activeIndex].position);
        moveValue = diffDistance + this.childPercentW + this.gap + 2;
      } else {
        const diffDistance = Math.abs(this.childsArray[this.activeIndex].maxLeftPosition - this.childsArray[this.activeIndex].position);
        moveValue = diffDistance;
      }
    }

    if (this.direction === 'right') {
      if (this.isReverseDirection) {
        const diffDistance = Math.abs(this.childsArray[this.activeIndex].maxLeftPosition - this.childsArray[this.activeIndex].position);
        moveValue = this.childPercentW + (this.childPercentW - diffDistance) + this.gap + 2;
      } else {
        const diffDistance = Math.abs(this.childsArray[this.activeIndex].maxLeftPosition - this.childsArray[this.activeIndex].position);
        moveValue = this.childPercentW + (this.childPercentW - diffDistance) + this.gap + 2;
      }
    }

    const startMarquee = (): void => {
      moveValue -= speed;

      if (moveValue > 0) {
        this._handlePosition(speed);
        transitionId = requestAnimationFrame(startMarquee);
      } else {
        this.stop();
        setTimeout(() => {
          this.start();
          this.isClick = false;
        }, this.speed * 100);
        if (transitionId !== null) {
          cancelAnimationFrame(transitionId);
          transitionId = null;
        }
      }
    };

    if (!this.lastFrameTime) this.lastFrameTime = performance.now();
    const deltaTime = performance.now() - this.lastFrameTime;

    if (deltaTime < this.frameInterval) {
      transitionId = requestAnimationFrame(startMarquee);
      return;
    }

    this.lastFrameTime = performance.now();
    startMarquee();
  }

  /**
   * 開始
   */
  public start(): void {
    this._setDirection();
    const startMarquee = (): void => {
      this._handlePosition(this.speed);
      this.marqueeAnimationFrameId = requestAnimationFrame(startMarquee);
    };

    if (!this.lastFrameTime) this.lastFrameTime = performance.now();
    const deltaTime = performance.now() - this.lastFrameTime;

    if (deltaTime < this.frameInterval) {
      this.marqueeAnimationFrameId = requestAnimationFrame(startMarquee);
      return;
    }

    this.lastFrameTime = performance.now();
    startMarquee();

    // 觸發 start 事件
    const startEvent = new CustomEvent<TWebMarqueeEventDetail>('web-marquee:start', {
      detail: {
        element: this,
      },
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(startEvent);
  }

  /**
   * 停止
   */
  public stop(): void {
    if (this.marqueeAnimationFrameId !== null) {
      cancelAnimationFrame(this.marqueeAnimationFrameId);
    }

    // 觸發 stop 事件
    const stopEvent = new CustomEvent<TWebMarqueeEventDetail>('web-marquee:stop', {
      detail: {
        element: this,
      },
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(stopEvent);
  }

  /**
   * 更新
   */
  public refresh(): void {
    this.stop();
    this._clearCloneChilds();
    this._addCloneChilds();
    this.start();

    // 觸發 refresh 事件
    const refreshEvent = new CustomEvent<TWebMarqueeEventDetail>('web-marquee:refresh', {
      detail: {
        element: this,
      },
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(refreshEvent);
  }

  /**
   * 上一個
   */
  public prev(): void {
    if (this.isClick) return;
    this.stop();
    this.isClick = true;

    if (this.reverseDirection) {
      this.direction = 'left';
    } else {
      this.direction = 'right';
    }

    this._handleTransition();

    // 觸發 prev 事件
    const prevEvent = new CustomEvent<TWebMarqueeEventDetail>('web-marquee:prev', {
      detail: {
        element: this,
      },
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(prevEvent);
  }

  /**
   * 下一個
   */
  public next(): void {
    if (this.isClick) return;
    this.stop();
    this.isClick = true;

    if (this.reverseDirection) {
      this.direction = 'right';
    } else {
      this.direction = 'left';
    }

    this._handleTransition();

    // 觸發 next 事件
    const nextEvent = new CustomEvent<TWebMarqueeEventDetail>('web-marquee:next', {
      detail: {
        element: this,
      },
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(nextEvent);
  }
}

// 檢查是否已註冊
if (typeof window === 'undefined' || !window.customElements) {
  console.warn('Web Components are not supported in this environment.');
  throw new Error('Web Components are not supported in this environment.');
} else if (!window.customElements.get('web-marquee')) {
  customElements.define('web-marquee', WebMarquee);
}

// 匯出型別定義供使用者使用
export type { TWebMarqueeEventDetail, TDirection, TChildPosition };
// 匯出類別供外部使用
export { WebMarquee };
