customElements.define(
  "spread-sheet",
  class extends HTMLElement {
    // ========================================================================
    Element(
      { tag, Elements = [], ...props },
      el = Object.assign(document.createElement(tag), props)
    ) {
      el.append(...Elements);
      return el;
    }
    // ========================================================================
    connectedCallback(
      sheet = this,
      rows = (sheet.getAttribute("rows") || "123").split``,
      cols = (sheet.getAttribute("columns") || "ABC").split``
    ) {
      // sheet is WebComponent this
      sheet.mode = 1; // if TRUE calculates all cells
      sheet.cells = rows
        .map((row, rx) =>
          cols.map((col, cx) => ({
            col,
            row,
            cx,
            rx,
            name: String(col) + String(row),
          }))
        )
        .flat()
        .map(({ col, row, rx, cx, name }) => {
          // ------------------------------------------------------------
          sheet[name] = new Proxy(
            sheet.Element({
              tag: "input",
              id: name,
              value: 0,
              // ------------------------------------------------------------
              // shadowParts
              part: `cell ${name} col${cx + 1} row${rx + 1}`,
              parts: new Set([
                `cell`,
                name,
                `col${cx + 1}`,
                `row${rx + 1}`,
              ]),
              cellpart: (value) => {
                let input = sheet[name].input; // sheet[name] is a proxy, input points directly to the input element
                if (value[0] == "-")
                  input.parts.delete((value = value.slice(1)));
                else input.parts.add(value);
                input.part = Array.from(input.parts).join(" "); // create part attribute
              },
              // ------------------------------------------------------------
              col,
              row,
              cx,
              rx,
              formula: name, // if formula != id then its a formula
              onkeyup: (evt) => {
                // console.log(evt.key, evt.keyCode, name);
                if (evt.keyCode == 13 /* Enter */) {
                  // ------------------------------------------------------------
                  // setter triggers calculation of whole sheet
                  // assign calculated value to cell
                  sheet[name].value = evt.target.value;
                  //evt.target.value is now CALCULATED value
                  sheet.mode = 1;
                  sheet.calc();
                  // ------------------------------------------------------------
                } else if (evt.keyCode == 113 /* F2 */) {
                  // ------------------------------------------------------------
                  this.toggle(this);
                  // ------------------------------------------------------------
                } else if (
                  sheet.mode && // if executing formulas, then navigation is allowed
                  evt.keyCode > 36 &&
                  evt.keyCode <
                    41 /* arrowLeft, arrowUp, arrowRight, arrowDown */
                ) {
                  // ------------------------------------------------------------
                  let c = cx,
                    r = rx;
                  if (evt.keyCode == 37 && c > 0) --c;
                  else if (evt.keyCode == 38 && r > 0) --r;
                  else if (evt.keyCode == 39 && c < cols.length) ++c;
                  else if (evt.keyCode == 40 && r < rows.length) ++r;
                  sheet.go(String(cols[c]) + String(rows[r]));
                  // ------------------------------------------------------------
                }
              }, //onkeyup
              // ------------------------------------------------------------
            }), // SHEET.ELEMENT
            // ------------------------------------------------------------
            {
              // proxy options
              // ------------------------------------------------------------ proxy getter
              get(target, key) {
                if (typeof sheet[key] == "function") {
                  return target[key].bind(target); // execute func with input scope
                } else if (key in target) return target[key];
                else return target;
              }, // GETTER
              // ------------------------------------------------------------ proxy setter
              set(target, key, value) {
                // ------------------------------------------------------------ formula
                if (value[0] == "=") target.formula = value;
                // ------------------------------------------------------------ default
                if (key in target) {
                  target[key] = value;
                  sheet.calc();
                  return value;
                } else {
                  console.error("SETTER", key, value);
                }
              }, // SETTER
              // ------------------------------------------------------------
              defineProperty(target, key, descriptor) {
                if (descriptor && "value" in descriptor) {
                  target.setItem(key, descriptor.value);
                }
                return target;
              },
            }
          );
          return sheet[name].input; // new Proxy
        });
      // ------------------------------------------------------------
      sheet
        .attachShadow({
          mode: "open",
        })
        .append(
          sheet.Element({
            tag: "style",
            innerHTML:
              `div{display:grid;grid:${"repeat(" + rows.length + ",1fr)"}/${
                "repeat(" + cols.length + ",1fr)"
              };gap:0;margin:0;padding:0}` + `input{width:calc(100% - 5px)}`,
          }),
          sheet.Element({
            tag: "div",
            Elements: sheet.cells, // map cellnames
          })
        ); // append
      // ------------------------------------------------------------
    } // connectedCallback
    // ========================================================================
    toggle(sheet = this) {
      sheet.toggleAttribute("formula", !(sheet.mode = !sheet.mode));
      sheet.cells.map((node) => {
        node.value =
          node.formula == node.id
            ? node.value // no formula
            : sheet.mode
            ? (sheet[node.id].value = node.formula)
            : node.formula || node.value;
        sheet.calc();
      });
    }
    // ========================================================================
    calc(sheet = this) {
      sheet.cells.map((node) => {
        // ------------------------------------------------------------ set node part attribute
        node.cellpart(
          sheet.mode || node.id == node.formula ? "-formula" : "formula"
        );
        // ------------------------------------------------------------
        if (sheet.mode && node.formula)
          node.value = eval(
            node.formula
              .split(/\s*(<?->|[-&|()]|\w+)\s*/) // split on operators
              .filter(Boolean) // remove empty strings
              //.slice(node.formula[0] == "=" ? 1 : 0) // remove = from formula
              .map((n) => n.replace("=", ""))
              .map((n) => {
                if (node.id == node.formula) return node.value;
                else
                  return sheet[n] // if a proxy for this n named input exists
                    ? sheet[n].input.value // return its value
                    : n; //else return input value .eg 10+A1 returns 10
              }).join``
          ); // eval
        // ------------------------------------------------------------
        //if (node.formula) node.value = value;
      });
    }
    // ========================================================================
    go(cellname) {
      this[cellname]?.focus();
    }
    // ========================================================================
  }
);
