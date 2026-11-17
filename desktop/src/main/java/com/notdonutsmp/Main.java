package com.notdonutsmp;

import java.awt.Desktop;
import java.net.URI;
import javax.swing.JOptionPane;

public class Main {
    private static final String SITE_URL = "https://r7981435-star.github.io/discordremakestarred/";

    public static void main(String[] args) {
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(new URI(SITE_URL));
            } else {
                // OS-specific fallbacks if Desktop.browse is not supported
                String os = System.getProperty("os.name").toLowerCase();
                Runtime runtime = Runtime.getRuntime();
                if (os.contains("win")) {
                    runtime.exec(new String[]{"rundll32", "url.dll,FileProtocolHandler", SITE_URL});
                } else if (os.contains("mac")) {
                    runtime.exec(new String[]{"open", SITE_URL});
                } else if (os.contains("nix") || os.contains("nux")) {
                    runtime.exec(new String[]{"xdg-open", SITE_URL});
                } else {
                    JOptionPane.showMessageDialog(null, "Please visit: " + SITE_URL, "Not Donut SMP", JOptionPane.INFORMATION_MESSAGE);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            JOptionPane.showMessageDialog(null, "Could not open browser:\n" + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }
}
