# web-marquee

一個可自訂的 Web Component，用於建立平滑的跑馬燈動畫，支援拖曳、hover 暫停和靈活的方向控制。

## 特色

- ✨ 使用標準 Web Components API
- 🎯 完整 TypeScript 支援
- 🎨 可自訂動畫速度和方向
- 🖱️ 支援滑鼠拖曳互動
- ⏸️ Hover 時暫停功能
- 📱 響應式設計
- 🎭 Active 狀態管理
- 🔄 提供完整的事件系統

## 安裝

### 套件管理

```bash
# 使用 npm
npm install @umon752/web-marquee

# 使用 pnpm
pnpm add @umon752/web-marquee

# 使用 yarn
yarn add @umon752/web-marquee
```

### CDN

```html
<!-- unpkg -->
<script type="module" src="https://unpkg.com/@umon752/web-marquee"></script>

<!-- jsDelivr -->
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@umon752/web-marquee"
></script>
```

## 使用方式

### 基本用法

```html
<web-marquee
  marquee-speed="1"
  marquee-pause-on-hover
  marquee-enable-drag
  marquee-active-class="is-active"
>
  <div><div>Item 1</div></div>
  <div><div>Item 2</div></div>
  <div><div>Item 3</div></div>
</web-marquee>

<script type="module">
  import { WebMarquee } from '@umon752/web-marquee';

  const marquee = document.querySelector('web-marquee');
</script>
```

### 反向移動

```html
<web-marquee marquee-speed="1.5" marquee-reverse-direction>
  <div><div>向右移動</div></div>
  <div><div>Item 2</div></div>
  <div><div>Item 3</div></div>
</web-marquee>
```

## API

### 屬性 (Attributes)

| 屬性                        | 類型      | 預設值  | 說明                          |
| --------------------------- | --------- | ------- | ----------------------------- |
| `marquee-speed`             | `number`  | `1`     | 移動速度，數值越大越快        |
| `marquee-pause-on-hover`    | `boolean` | `false` | 是否在滑鼠 hover 時暫停       |
| `marquee-enable-drag`       | `boolean` | `false` | 是否啟用拖曳功能              |
| `marquee-active-class`      | `string`  | `''`    | 當前 active 項目的 class 名稱 |
| `marquee-reverse-direction` | `boolean` | `false` | 是否反向移動（向右）          |

### 方法 (Methods)

#### `start(): void`

開始跑馬燈動畫。

```javascript
const marquee = document.querySelector('web-marquee');
marquee.start();
```

#### `stop(): void`

停止跑馬燈動畫。

```javascript
marquee.stop();
```

#### `refresh(): void`

重新初始化跑馬燈（當內容變更時使用）。

```javascript
marquee.refresh();
```

#### `prev(): void`

移動到上一個項目。

```javascript
marquee.prev();
```

#### `next(): void`

移動到下一個項目。

```javascript
marquee.next();
```

### 事件 (Events)

所有事件都會提供 `detail` 物件，包含 `element` 屬性指向當前的 `WebMarquee` 實例。

| 事件名稱              | 觸發時機       | Detail 類型              |
| --------------------- | -------------- | ------------------------ |
| `web-marquee:start`   | 開始動畫時     | `TWebMarqueeEventDetail` |
| `web-marquee:stop`    | 停止動畫時     | `TWebMarqueeEventDetail` |
| `web-marquee:refresh` | 重新初始化時   | `TWebMarqueeEventDetail` |
| `web-marquee:prev`    | 移動到上一個時 | `TWebMarqueeEventDetail` |
| `web-marquee:next`    | 移動到下一個時 | `TWebMarqueeEventDetail` |

#### 監聽事件範例

```javascript
const marquee = document.querySelector('web-marquee');

marquee.addEventListener('web-marquee:start', (e) => {
  console.log('Marquee started:', e.detail.element);
});

marquee.addEventListener('web-marquee:stop', (e) => {
  console.log('Marquee stopped:', e.detail.element);
});

marquee.addEventListener('web-marquee:next', (e) => {
  console.log('Moved to next item:', e.detail.element);
});
```

### TypeScript 支援

此套件包含完整的 TypeScript 型別定義：

```typescript
import type {
  TWebMarqueeEventDetail,
  TDirection,
  TChildPosition,
} from '@umon752/web-marquee';

const marquee = document.querySelector<WebMarquee>('web-marquee');

marquee?.addEventListener(
  'web-marquee:start',
  (e: CustomEvent<TWebMarqueeEventDetail>) => {
    console.log(e.detail.element);
  },
);
```

## 樣式自訂

### CSS 變數

Web Component 使用 Shadow DOM，但內容（slot）仍可以透過外部 CSS 設定樣式：

```css
web-marquee {
  display: flex;
  align-items: center;
  overflow: hidden;
}

web-marquee > div {
  flex-shrink: 0;
  padding: 0 10px;
}

/* Active 狀態 */
web-marquee > div.is-active {
  background-color: #007bff;
  color: white;
}
```

### 注意事項

- 不要在子元素的直接層設定 `transform` transition，這會與 JavaScript 產生的 transform 衝突
- Active 樣式應設定在子元素的內層
- 間距目前只能使用 `padding` 設定，無法使用 `gap` 或 `margin`

## 瀏覽器支援

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

需要支援 Web Components API (Custom Elements, Shadow DOM)。

## 授權

MIT License - 詳見 [LICENSE](LICENSE) 檔案
