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
      columns = (sheet.getAttribute("columns") || "ABC").split``
    ) {
      sheet.connected = false;
      sheet.formula = true; // if TRUE calculates all cells
      sheet.cells = rows
        .map((row, rowidx) =>
          columns.map((col, colidx) => ({
            col,
            row,
            colidx,
            rowidx,
            name: String(col) + String(row),
          }))
        )
        .flat()
        .map(({ col, row, rowidx, colidx, name }) => {
          sheet[name] = new Proxy(
            sheet.Element({
              tag: "input",
              id: name,
              value: 0,
              part: `cell ${name} col${colidx + 1} row${rowidx + 1}`,
              parts: new Set([
                `cell`,
                name,
                `col${colidx + 1}`,
                `row${rowidx + 1}`,
              ]),
              setparts: (value) => {
                let input = sheet[name].input; // sheet[name] is a proxy, input points directly to the input element
                if (value[0] == "-")
                  input.parts.delete((value = value.slice(1)));
                else input.parts.add(value);
                input.part = Array.from(input.parts).join(" "); // create part attribute
              },
              col,
              row,
              colidx,
              rowidx,
              formula: name, // if formula != id then its a formula
              onkeyup: (evt) => {
                console.log(evt.key, evt.keyCode, name);
                if (evt.keyCode == 13 /* Enter */) {
                  // ------------------------------------------------------------
                  // setter triggers calculation of whole sheet
                  //if (evt.target.value[0] == "=")
                  //sheet[name].formula = evt.target.value;
                  // assign calculated value to cell
                  sheet[name].value = evt.target.value;
                  //evt.target.value is now CALCULATED value
                  //console.error(evt.target.value, "::", sheet[name].formula);
                  sheet.formula = false;
                  sheet.calc();
                  // ------------------------------------------------------------
                } else if (evt.keyCode == 113 /* F2 */) {
                  // ------------------------------------------------------------
                  this.toggle(this);
                  // ------------------------------------------------------------
                } else if (
                  evt.keyCode > 36 &&
                  evt.keyCode <
                    41 /* arrowLeft, arrowUp, arrowRight, arrowDown */
                ) {
                  // ------------------------------------------------------------
                  let c = colidx,
                    r = rowidx;
                  if (evt.keyCode == 37 && c > 0) --c;
                  else if (evt.keyCode == 38 && r > 0) --r;
                  else if (evt.keyCode == 39 && c < columns.length) ++c;
                  else if (evt.keyCode == 40 && r < rows.length) ++r;
                  sheet.go(String(columns[c]) + String(rows[r]));
                  // ------------------------------------------------------------
                } else console.warn("key", evt.key, evt.keyCode);
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
                try {
                  // ------------------------------------------------------------ key=="part"
                  if (key == "part") {
                    //console.error(target.parts);
                    sheet[name].setparts(value);
                    return target;
                  }
                  // ------------------------------------------------------------ formula
                  if (value[0] == "=") {
                    target.formula = value;
                  }
                  // ------------------------------------------------------------ default
                  if (key in target) {
                    target[key] = value;
                    console.warn(
                      "set",
                      name,
                      key,
                      value,
                      key in target,
                      target.formula
                    );
                    sheet.calc();
                    return value;
                  } else {
                    console.error("SETTER", key, value);
                  }
                } catch (e) {
                  console.error("setter", e);
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
            innerText:
              `div{display:grid;grid:${"repeat(" + rows.length + ",1fr)"}/${
                "repeat(" + columns.length + ",1fr)"
              };gap:0;margin:0;padding:0}` + `input{width:calc(100% - 5px)}`,
          }),
          sheet.Element({
            tag: "div",
            Elements: sheet.cells, // map cellnames
          })
        ); // append
      // ------------------------------------------------------------
      //console.log("col:", sheet.A1.col, sheet.A1.colidx);
      sheet.connected = true;
      sheet.A1.value = 22;
      sheet.B1.value = 10;
      sheet.A2.value = 20;
      sheet.C1.value = "=A1+B1";
      sheet.A3.value = "=A1*A2";
      sheet.A1.part = "foo";
      sheet.A1.part = "-foo";
      sheet.C2.value = "=C1";
      sheet.A1.value = 22;
      sheet.A2.value = 10;
      sheet.A3.value = "=(A1*A2+20)*.9";
      sheet.A1.part = "foo";
      sheet.A1.part = "-foo";
      //console.log(sheet.A1.parts);
      //sheet.C1.focus();
      sheet.go("A3");
      sheet.toggle(sheet);
    } // connectedCallback
    // ========================================================================
    toggle(sheet = this) {
      console.log("show formulas", this.formula);
      sheet.toggleAttribute("formula", !(sheet.formula = !sheet.formula));
      this.cells.map((node) => {
        console.log(node.id, node.value, node.formula, sheet.formula);
        node.value =
          node.formula == node.id
            ? node.value // no formula
            : sheet.formula
            ? (this[node.id].value = node.formula)
            : node.formula || node.value;
        this.calc();
      });
    }
    // ========================================================================
    calc(sheet = this) {
      if (this.connected) {
        console.log("CALC", sheet.formula, sheet.cells.length, sheet.connected);
        sheet.cells.map((node) => {
          console.log(
            node.id,
            node.formula,
            node.value,
            node,
            node.formula[0] == "="
            );
            // ------------------------------------------------------------ set node part attribute
            if (node.id == node.formula) {
              node.setparts("-formula");
              node.parts.delete("formula");
            } else {
              node.setparts("formula");
              node.parts.add("formula");
            }
            node.part = Array.from(node.parts).join(" "); // create part attribute
          // ------------------------------------------------------------

          if (sheet.formula) {
            let value = eval(
              node.formula
              .split(/\s*(<?->|[-&|()]|\w+)\s*/) // split on operators
              .filter(Boolean)
              .slice(node.formula[0] == "=" ? 1 : 0) // remove = from formula
              .map((n, i, arr) => {
                if (node.id == node.formula) return node.value;
                try {
                  let ret = sheet[n] // if a proxy for this n named input exists
                  ? sheet[n].input.value // return its value
                  : n; //else return input value .eg 10+A1 returns 10
                  // console.error(this[n], ret);
                  return ret;
                } catch (e) {
                  console.error(e);
                }
              }).join``
              ); // eval
              console.log(
                `%c VALUE: ${node.id} `,
                "background:blue;color:white",
                node.formula,
                value
            );
            if (node.formula) node.value = value;
          }
        });
      } else {
        // not this.connected
      }
    }
    // ========================================================================
    go(cellname) {
      this[cellname].focus();
    }
    // ========================================================================
  }
  );
  