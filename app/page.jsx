import { redirect } from "next/navigation";

async function go() {
  "use server";
  redirect("/target");
}

export default function Page() {
  return (
    <form action={go}>
      <button>Go</button>
    </form>
  );
}
