from langgraph.graph import END, StateGraph

from agent.nodes import node1_identify, node2_fetch, node3_synthesize, node_error
from agent.state import AgentState


def _route_after_identify(state: AgentState) -> str:
    if state.get("is_valid_query") and state.get("country_names"):
        return "fetch"
    return "error"


def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("identify", node1_identify)
    graph.add_node("fetch", node2_fetch)
    graph.add_node("synthesize", node3_synthesize)
    graph.add_node("error", node_error)

    graph.set_entry_point("identify")

    graph.add_conditional_edges(
        "identify",
        _route_after_identify,
        {"fetch": "fetch", "error": "error"},
    )

    graph.add_edge("fetch", "synthesize")
    graph.add_edge("synthesize", END)
    graph.add_edge("error", END)

    return graph.compile()


agent = build_graph()
