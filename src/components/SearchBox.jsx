function SearchBox() {
  return (
    <section className="buscador">
      <h2>¿A dónde quieres ir?</h2>

      <div className="campos">
        <input type="text" value="Asturias (OVD)" readOnly />
        <input type="text" value="29 ago - 5 sep" readOnly />
        <input type="text" value="1 adulto, 1 niño" readOnly />
        <input type="text" value="1.000 € máximo" readOnly />
      </div>

      <button>BUSCAR VIAJE</button>
    </section>
  );
}

export default SearchBox;