customElements.define(
  "spread-sheet",
  class extends HTMLElement {
    Element(
      { tag, Elements = [], ...props },
      el = Object.assign(document.createElement(tag), props)
    ) {
      el.append(...Elements);
      return el;
    }
    connectedCallback(
      rows = (this.getAttribute("rows") || "123").split``,
      columns = (this.getAttribute("columns") || "ABC").split``,
      sheet = this
    ) {
      this.cells = rows
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
            this.Element({
              tag: "input",
              id: name,
              value: name,
              part: `cell ${name} col${colidx + 1} row${rowidx + 1}`,
              parts: new Set([
                `cell`,
                name,
                `col${colidx + 1}`,
                `row${rowidx + 1}`,
              ]),
              col,
              row,
              colidx,
              rowidx,
              formula: false,
              onkeyup: (evt) => {
                console.log(evt.key, evt.keyCode);
                if (evt.key == "Enter") this.calc();
                else if (evt.keyCode > 36 && evt.keyCode < 41) {
                  let newcol = colidx,
                    newrow = rowidx;
                  if (evt.keyCode == 37 && newcol > 0) --newcol;
                  else if (evt.keyCode == 38 && newrow > 0) --newrow;
                  else if (evt.keyCode == 39 && newcol < columns.length)
                    ++newcol;
                  else if (evt.keyCode == 40 && newrow < rows.length) ++newrow;
                  sheet.go(String(columns[newcol]) + String(rows[newrow]));
                } else console.warn("key", evt.key, evt.keyCode);
              }, //onkeyup
            }),
            {
              get(target, key) {
                if (typeof sheet[key] == "function") {
                  return target[key].bind(target);
                } else if (key in target) return target[key];
                else return target;
                // for now unused chaining
                return (value) => {
                  if (value) {
                    target[key] = value;
                    return new Proxy(target, sheet[name]);
                  }
                  return target[key];
                };
              },
              set(target, key, value) {
                if (key == "part") {
                  // remove part name
                  if (value[0] == "-")
                    target.parts.delete((value = value.slice(1)));
                  else target.parts.add(value);
                  target.part = Array.from(target.parts).join(" ");
                  return target;
                }
                // value is formula
                if (value[0] == "=") target.formula = value;
                else target.formula = false;
                //
                if (key in target) {
                  target[key] = value;
                  sheet.calc();
                  return value;
                } else {
                  //console.error("setter", key, value);
                }
              },
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
      this.attachShadow({
        mode: "open",
      }).append(
        this.Element({
          tag: "style",
          innerText:
            `div{display:grid;grid:${"repeat(" + rows.length + ",1fr)"}/${
              "repeat(" + columns.length + ",1fr)"
            };gap:0;margin:0;padding:0}` + `input{width:calc(100% - 5px)}`,
        }),
        this.Element({
          tag: "div",
          Elements: this.cells, // map cellnames
        })
      ); // append
      //console.log("col:", this.A1.col, this.A1.colidx);
      /*       this.A1.value = 22;
      this.B1.value = 10;
      this.A2.value = 20;
      this.A3.value = "=A1*A2";
      this.C1.value = "=A1+B1";
      this.A1.part = "foo";
      this.A1.part = "-foo";
       */ //console.log(this.A1.parts);
      //this.B2.focus();
      this.go("C1");
    } // connectedCallback
    calc() {
      this.cells.map((node) => {
        if (node.formula)
          node.value = eval(
            node.formula
              .split(/\s*(<?->|[-&|()]|\w+)\s*/) // split on operators
              .filter(Boolean)
              .slice(1)
              .map((n) => (this[n] ? this[n].value : n)).join``
          );
      });
    }
    go(cellname) {
      this[cellname].focus();
    }
  }
);
