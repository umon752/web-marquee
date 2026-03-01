/**
 * Marquee 類別 (跑馬燈)
 * @param {String} 帶入 parent selector
 * @param {Number} speed 移動速度
 * @param {Boolean} pauseOnHover 是否啟用 hover 暫停，預設 false
 * @param {Boolean} enableDrag 是否啟用拖曳功能，預設 false
 * @param {String} activeClass 設定 active class name
 * @param {Boolean} reverseDirection 是否啟用反向功能 (向右移動)，預設 false (向左移動)
 */
export class Marquee {
  // 預設設定
  defaultOptions = {
    speed: 1,
    pauseOnHover: false,
    enableDrag: false,
    activeClass: '',
    reverseDirection: false,
    init: () => {},
    update: () => {},
  }

  #parent; // 父元素
  #childs; // 原始子元素
  #cloneChilds; // 複製後的子元素
  #gap = 0; // 間距
  #marqueeAnimationFrameId;
  #childPercentW = 100; // 子元素寬度為 100%
  #childTotalW = 0; // 原始子元素總寬度
  #cloneChildTotalW = 0; // 複製後的子元素總寬度
  #childHtml; // 子元素 HTML
  #childsArray = []; // 子元素位置陣列
  #direction = 'left'; // 移動方向
  
  #lastFrameTime = 0; // 上一幀的時間戳
  #frameInterval = 1000 / 60; // 目標幀率（60fps）

  #isMouseDown = false; // 是否按下滑鼠
  #startDragX = null; // 拖曳起始位置
  #isClick = false; // 是否點擊
  #isReverseDirection = false; // 是否反向 (向右移動)
  #activeIndex = 0; // active index

  constructor(selector, options) {
    // 選填設定
    this.options = { ...this.defaultOptions, ...options };

    this.#addRequired(selector);
  }

  #addRequired(selector) {
    if (!selector) {
      throw new Error('selector is not defined');
    } 
    if(typeof selector !== 'string') {
      this.#parent = selector;
    } else {
      this.#parent = document.querySelector(selector);
    }
    this.#childs = this.#parent.children;
    this.#addOptional();
  }

  #addOptional() {
    // 設定
    const settings = new Map([
      ['speed', { type: 'number', defaultValue: this.defaultOptions.speed,}],
      ['pauseOnHover', { type: 'boolean', defaultValue: this.defaultOptions.pauseOnHover,}],
      ['enableDrag', { type: 'boolean', defaultValue: this.defaultOptions.enableDrag,}],
      ['activeClass', { type: 'string', defaultValue: this.defaultOptions.activeClass,}],
      ['reverseDirection', { type: 'boolean', defaultValue: this.defaultOptions.reverseDirection,}],
      ['init', { type: 'function', defaultValue: this.defaultOptions.init }],
      ['update', { type: 'function', defaultValue: this.defaultOptions.update }]
    ]);

    settings.forEach((setting, key) => {
      if (this.options[key] === undefined) {
        this[key] = setting.defaultValue;
      } else if (typeof this.options[key] !== setting.type) {
        throw new Error(`${key} is not a ${setting.type} type`);
      } else {
        this[key] = this.options[key];
      }
    });
  
    this.#init();
  }

  #init() {
    this.#setDirection();
    this.#addCloneChilds();
    this.start();
    this.#addEvents();
    this.init();
  }

  #setDirection() {
    if(this.reverseDirection) {
      this.#direction = 'right';
      this.#isReverseDirection = true;
    } else {
      this.#direction = 'left';
    }
  }

  #addCloneChilds() {
    const gapStyle = parseInt(window.getComputedStyle(this.#parent).getPropertyValue('gap'));
    this.#gap = gapStyle ? gapStyle : 0;
    const childsLength = this.#childs.length;

    [...this.#childs].forEach((child) => {
      this.#childTotalW += child.offsetWidth;
    });
    this.#childTotalW += this.#gap * childsLength;
  
    const winW = window.innerWidth;
    // 計算填滿螢幕寬度所需的複製次數
    const cloneTimes = Math.ceil(winW / this.#childTotalW);
    this.#childHtml = this.#parent.innerHTML;
    const afterContent = this.#childHtml.repeat(cloneTimes);
    // 複製到元素內的子元素後面
    this.#parent.insertAdjacentHTML('beforeend', afterContent);
    this.#cloneChilds = this.#parent.children;

    [...this.#cloneChilds].forEach((child, i) => {
      // 預設第一個子元素 active
      if(this.activeClass !== '') {
        if(i === 0) child.classList.add(this.activeClass);
      }
      this.#cloneChildTotalW += child.offsetWidth;
    });
    this.#cloneChildTotalW += this.#gap * childsLength;


    this.#childsArray = [...this.#cloneChilds].map((child, i) => {
      return {
        position: 0,
        maxLeftPosition: 0,
        maxRightPosition: 0,
        activePosition: 0,
        isRightOut: false,
      }
    })
  }

  #clearCloneChilds() {
    this.#parent.innerHTML = this.#childHtml;
  }

  #addEvents() {
    // 啟用 hover 暫停
    if(this.pauseOnHover) {
      this.#parent.addEventListener('mouseenter', () => {
        const isTouchDevice = 'ontouchstart' in document.documentElement;
        if(isTouchDevice) return;
        this.stop();
      });
    }
    // 啟用拖曳功能
    if(this.enableDrag) {
      this.#parent.addEventListener('mousedown', (e) => this.#startDrag(e));
      this.#parent.addEventListener('mousemove', (e) => this.#moveDrag(e));
      this.#parent.addEventListener('mouseup', () => this.#stopDrag());
    }
    // 啟用 hover 暫停或拖曳功能
    if(this.pauseOnHover || this.enableDrag) {
      this.#parent.addEventListener('mouseleave', () => this.start());
    }
  }

  #startDrag(e) {
    this.#isMouseDown = true;
    this.#startDragX = e.pageX;
    this.stop();
  }

  #moveDrag(e) {
    e.preventDefault();
    if (!this.#isMouseDown || this.#isClick) return;

    const moveValue = (e.pageX - this.#startDragX) / 100;

    if(this.#startDragX < e.pageX) this.#direction = 'right';
    if(this.#startDragX > e.pageX) this.#direction = 'left';
    
    this.#handlePosition(moveValue);
  }

  #stopDrag() {
    this.#isMouseDown = false;
    this.stop();
  }

  #handlePosition(moveValue) {
    [...this.#cloneChilds].forEach((child, i) => {
      // 往左
      if(this.#direction === 'left') {
        this.#childsArray[i].maxLeftPosition = (this.#childPercentW * (i + 1)) * - 1;
        if(this.#isClick) {
          this.#childsArray[i].position += -moveValue;
        } else {
          this.#childsArray[i].position += (this.#isMouseDown || this.#isReverseDirection ? moveValue : -moveValue);
        }

        if(this.#childsArray[i].position <= this.#childsArray[i].maxLeftPosition) {
          this.#childsArray[i].position += (this.#cloneChilds.length * this.#childPercentW);
          this.changeActive(i);
        }
      }
      // 往右 
      if(this.#direction === 'right') {
        this.#childsArray[i].maxRightPosition = (this.#cloneChilds.length - (i + 1)) * this.#childPercentW;
        if(this.#isClick) {
          this.#childsArray[i].position += moveValue;
        } else {
          this.#childsArray[i].position += (this.#isMouseDown || this.#isReverseDirection ? moveValue : -moveValue);
        }
        
        if(this.#childsArray[i].position >= this.#childsArray[i].maxRightPosition) {
          this.#childsArray[i].position -= (this.#cloneChilds.length * this.#childPercentW);
          this.changeActive(i);
        }
      }
      Object.assign(child.style, {
        transform: `translate3d(${this.#childsArray[i].position}%, 0, 0)`
      });
    });
  }

  changeActive(index) {
    if(this.activeClass === '') return;


    [...this.#cloneChilds].forEach((child, i) => {
      child.classList.remove(this.activeClass);
    })
    if(index === (this.#cloneChilds.length - 1)) index = -1;
    this.#cloneChilds[index + 1].classList.add(this.activeClass);
    this.#activeIndex = index + 1;
  }

  #handleTransition() {
    const speed = this.speed * 2;
    let transitionId = null;
    let moveValue = 0;

    if(this.#direction === 'left') {
      // active 的上一個
      if(this.#isReverseDirection) {
        const diffDistance = Math.abs(this.#childsArray[this.#activeIndex].maxLeftPosition - this.#childsArray[this.#activeIndex].position);
        moveValue = diffDistance + this.#childPercentW + this.#gap + 2;
      }
      // active 的下一個 
      else {
        const diffDistance = Math.abs(this.#childsArray[this.#activeIndex].maxLeftPosition - this.#childsArray[this.#activeIndex].position);
        moveValue = diffDistance;
      }
    }
    if(this.#direction === 'right') {
      // active 的下一個 
      if(this.#isReverseDirection) {
        const diffDistance = Math.abs(this.#childsArray[this.#activeIndex].maxLeftPosition - this.#childsArray[this.#activeIndex].position);
        moveValue = this.#childPercentW + (this.#childPercentW - diffDistance) + this.#gap + 2;
      }
      // active 的上一個 
      else {
        const diffDistance = Math.abs(this.#childsArray[this.#activeIndex].maxLeftPosition - this.#childsArray[this.#activeIndex].position);
        moveValue = this.#childPercentW + (this.#childPercentW - diffDistance) + this.#gap + 2;
      }
    }

    const startMarquee = () => {
      moveValue -= speed;

      if(moveValue > 0) {
        this.#handlePosition(speed);
        transitionId = requestAnimationFrame(startMarquee);
      } else {
        this.stop();
        // 停頓一下
        setTimeout(() => {
          this.start();
          this.#isClick = false;
        }, this.speed * 100);
        cancelAnimationFrame(transitionId);
        transitionId = null;
      }
    }

    // 計算幀間隔
    if (!this.#lastFrameTime) this.#lastFrameTime = performance.now();
    const deltaTime = performance.now() - this.#lastFrameTime;

    // 如果距離上一幀的時間小於目標幀間隔，則跳過這一幀
    if (deltaTime < this.#frameInterval) {
      transitionId = requestAnimationFrame(startMarquee);
      return;
    }

    // 更新上一幀時間
    this.#lastFrameTime = performance.now();
    startMarquee();
  }

  start() {
    this.#setDirection();
    const startMarquee = () => {
      this.#handlePosition(this.speed);
      this.#marqueeAnimationFrameId = requestAnimationFrame(startMarquee);
    }

    // 計算幀間隔
    if (!this.#lastFrameTime) this.#lastFrameTime = performance.now();
    const deltaTime = performance.now() - this.#lastFrameTime;

    // 如果距離上一幀的時間小於目標幀間隔，則跳過這一幀
    if (deltaTime < this.#frameInterval) {
      this.#marqueeAnimationFrameId = requestAnimationFrame(startMarquee);
      return;
    }

    // 更新上一幀時間
    this.#lastFrameTime = performance.now();
    startMarquee();
    // requestAnimationFrame(startMarquee);
  }

  stop() {
    cancelAnimationFrame(this.#marqueeAnimationFrameId);
  }

  refresh() {
    this.stop();
    this.#clearCloneChilds();
    this.#addCloneChilds();
    this.start();
    this.update();
  }

  prev() {
    if(this.#isClick) return;
    this.stop();
    this.#isClick = true;
    // this.#direction = 'right';
    if(this.reverseDirection) {
      this.#direction = 'left';
    } else {
      this.#direction = 'right';
    }

    this.#handleTransition();
  }

  next() {
    if(this.#isClick) return;
    this.stop();
    this.#isClick = true;
    // this.#direction = 'left';
    if(this.reverseDirection) {
      this.#direction = 'right';
    } else {
      this.#direction = 'left';
    }

    this.#handleTransition();
  }
}