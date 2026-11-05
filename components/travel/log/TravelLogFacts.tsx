export interface TravelLogFact {
  label: string;
  value: string;
}

/** Compact, comparable trip metadata shared by every travel-log variant. */
export default function TravelLogFacts({ items }: { items: readonly TravelLogFact[] }) {
  return <dl className="travel-log-facts">
    {items.map(item => <div key={item.label}>
      <dt>{item.label}</dt>
      <dd>{item.value}</dd>
    </div>)}
  </dl>;
}
