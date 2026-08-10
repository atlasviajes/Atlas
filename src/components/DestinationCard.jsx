function DestinationCard({
  destino,
  precio,
  score,
  noches,
  hotel,
  vuelo,
  etiqueta,
  imagen,
  onClick,
}) {
  return (
    <article className="travel-card" onClick={onClick}>
      <div className="travel-image-wrap">
        <img src={imagen} alt={destino} className="travel-image" />
        <span className="travel-badge">{etiqueta}</span>

        <button
          className="travel-favorite"
          onClick={(e) => e.stopPropagation()}
        >
          ♡
        </button>
      </div>

      <div className="travel-body">
        <h3>{destino}</h3>

        <p className="travel-details">
          {noches} noches · {hotel}
        </p>

        <span className="travel-flight">{vuelo}</span>

        <div className="travel-bottom">
          <div className="score-box">
            <div className="score-circle">{score}</div>

            <div>
              <small>Atlas Score</small>
              <strong>
                {score >= 90
                  ? "Oportunidad excepcional"
                  : score >= 85
                  ? "Muy buena oportunidad"
                  : "Buena oportunidad"}
              </strong>
            </div>
          </div>

          <div className="travel-price">
            <strong>{precio} €</strong>
            <small>por persona</small>
          </div>
        </div>
      </div>
    </article>
  );
}

export default DestinationCard;