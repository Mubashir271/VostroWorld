// src/utils/printScale.ts
//
// Sizing for the HTML → PDF printouts (react-native-html-to-pdf).
//
// On iOS the HTML is laid out in a WKWebView at its default 980px layout
// width and the print formatter scales that width onto the 595pt A4 page.
// CSS `zoom` is ignored when printing. The printouts were designed at A4's
// 96-dpi size (794px wide) with `zoom: 0.75`, so they came out at
// 794/980 = 81% of the intended size: the page box ended about three quarters
// down the paper (footer mid-page, blank paper below) and page 1 of the Client
// Assessment Form overflowed its footer (confirmed 8 Oct 2026 from a PDF the
// app generated in the Simulator).
//
// Fix: keep designing at 794px, but scale every px value in the stylesheet by
// 980/794 so the layout fills the 980px print width, i.e. the full A4 page.

/** 980 / 794: design px → print px. */
export const PRINT_SCALE = 980 / 794;

/** Scale every `<n>px` in a stylesheet by PRINT_SCALE. */
export const scaleCssPx = (css: string) =>
  css.replace(/(\d*\.?\d+)px/g, (_, n) => `${+(parseFloat(n) * PRINT_SCALE).toFixed(2)}px`);

/**
 * Inline script: shrink each `.page`'s `.inner` block until it ends above the
 * page's `.foot`, keeping it full width. Uses `transform`, which printing
 * honours (`zoom` is ignored). Pages that already fit are left alone.
 */
export const FIT_PAGES_SCRIPT = `<script>
  document.querySelectorAll('.page').forEach(function (page) {
    var inner = page.querySelector('.inner');
    var foot = page.querySelector('.foot');
    if (!inner || !foot) return;
    inner.style.transformOrigin = '0 0';
    var r = 1;
    for (var i = 0; i < 4; i++) {
      inner.style.transform = 'none';
      inner.style.width = (100 / r) + '%';
      var b = inner.getBoundingClientRect();
      var limit = foot.getBoundingClientRect().top - 6;
      if (i === 0 && b.bottom <= limit) return;
      r = (limit - b.top) / b.height;
    }
    inner.style.transform = 'scale(' + r + ')';
  });
</script>`;
