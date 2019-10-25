# IOSDevice

A set of hacks and workarounds for iOS Safari & Co.

Two main things this library fixes are `Keyboard` and `Viewport`.

To make this work, some pre-requirements have to be impelemented:

- `<body>` element should be `position: absolute`
- An additional element in `<body>` should be provided. Let's call it Layout
- Layout also should be `position: absolute`
- A `.ScrollView` or similar class has to be implemented. See example implementation in the end of the readme

## Keyboard

_file: `Keyboard.js`_

- `onOpen(position = 'default')` – should be called whenever a keyboard is opened, i.e. on `'focus'` event. `position` specifies how viewport should be bound:
  - `default` - does nothing
  - `top` – bounds top of the viewport to top of the screen
  - `bottom` – bounds bottom of the viewport to top of the keyboard
- `onClose()` – should be called when keybouad is closed, i.e. on `'focus'` event


## Viewport & Scroll

Viewport behavior is fixed by limiting on hacking some scrolling capabilities of iOS WebKit.

_file: `Viewport.js`_

- `init(params: DeviceViewportParams)` - prevents document from scrolling the viewport (see `preventDocumentScroll()` and `restoreDocumentScroll()`). If it was already inited, all currents ScrollViews will be cleared and params overrided (see `setScrollView()` and `cleanDocumentViews()`)
- `preventDocumentScroll(params: DeviceViewportParams)` - disables viewport scroll (also known as `<body>` scroll) and also all scrolling on the document. But allows to enable inner/sub ScrollViews which do not overscroll when scrolled to the end. Also:
  - Hides iOS Application Banner if `topBanner: false` parameter is set
  - Shifts document's content in iOS Safari in landscape mode using `layoutElement` parameter (which is `body` by default)
- `restoreDocumentScroll()` - restores document's scrolling, clears all ScrollViews and restores `layoutElement` to its original state
- `setScrollView(view: Element, params: ScrollViewParams)` - makes an element a ScrollView
- `cleanDocumentViews()` - clears of ScrollViews from all the listeners and initialization data

**`DeviceScrollParams`**

- `topBanner: boolean` – `true` by defualt. Use `false` to hide iOS Application banner on the page
- `layoutElement: string | Element` – `body` by default. An element to correct page position in viewport
- `stack: boolean` – `false` by default. Allows creating stacks with different params when using `preventDocumentScroll()`/`restoreDocumentScroll()`

**`ScrollViewParams`**

- `topBanner: { show: number, hide: number }` – Default: `{ show: 60, hide: 30 }`. Scroll offset for showing and hiding iOS Application Banner. If `DeviceScrollParams.topBanner` is set to `false`, then this param will be ignored and banner will be always hidden
- `allowX: boolean`/`allowY: boolean` – Default: `true`. Allows scrolling in a corresponding deirection. If set to `false`, scrolling won't be allowed on that element
- `overscrollX: boolean`/`overscrollY: boolean` – Default: `true`. Allows overscrolling on the given element. If set to `false`, overscrolling will be disabled. If `.ScrollView` class is used, it automatically disabled overscroll on the element
- `override: boolean` – Default: `true`. Indicates if params should be overriden for overlapping `setScrollView()` calls
- `standalone: boolean` – Default: `false`. If `true`, then ScrollView will be initialized even if `preventDocumentScroll()` hasn't been called yet and won't be removed after `restoreDocumentScroll()` call

### `.ScrollView` class name

`.ScrollView` should have at least these CSS props:

```css
.ScrollView {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 1px 0;
}
```

1 pixel padding is needed to move the scroll position from the edges to prevent iOS' overscrolling to outer views or viewport. See [InnerView](https://github.com/VKCOM/VKUI/tree/master/src/components/InnerScroll) for an implementation.

### Using without `.ScrollView`

`.ScrollView` doesn't work for every case for several reason. For example, it cannot be used for `textarea` element because it has a scroll-view inside of it (in Shadow DOM). Also `.ScrollView` isn't adopted for horizontal scrolling.

- To handle `textarea` use - `setScrollView({ overscrollY: false })`
- To handle horizontal scrolling use `setScrollView({ allowY: false })`

# LICENSE
[MIT](LICENSE)
