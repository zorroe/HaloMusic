import { createVNode, isVNode, render } from "vue";
import NotificationConstructor from "./Notification.vue";

let seed = 1;

const notify = (options:any) => {
  if (typeof options === "string" || isVNode(options)) {
    options = { message: options };
  }
  const id = `notification_${seed}`;
  const props = { ...options, id };

  const container = document.getElementById("ea-notify-container") || (() => {
    const container = document.createElement("div");
    container.id = "ea-notify-container";
    document.body.appendChild(container);
    return container;
  })();

  const vm = createVNode(NotificationConstructor, props, null);
  render(vm, container.appendChild(document.createElement("div")));
};

(window as any).notify = notify;


export default notify;